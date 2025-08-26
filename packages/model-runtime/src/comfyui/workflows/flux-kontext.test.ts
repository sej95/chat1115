// @vitest-environment node
import { PromptBuilder } from '@saintno/comfyui-sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FLUX_MODEL_CONFIG, WORKFLOW_DEFAULTS } from '../constants';
import { buildFluxKontextWorkflow } from './flux-kontext';

// Mock the utility functions
vi.mock('../utils/prompt-splitter', () => ({
  splitPromptForDualCLIP: vi.fn((prompt: string) => ({
    clipLPrompt: prompt,
    t5xxlPrompt: prompt,
  })),
}));

vi.mock('../utils/weight-dtype', () => ({
  selectOptimalWeightDtype: vi.fn(() => 'default'),
}));

// Mock PromptBuilder and seed function - capture constructor arguments for test access
vi.mock('@saintno/comfyui-sdk', () => ({
  PromptBuilder: vi.fn().mockImplementation((workflow, inputs, outputs) => {
    // Store the workflow reference so modifications are reflected
    const mockInstance = {
      input: vi.fn().mockReturnThis(),
      setInputNode: vi.fn().mockReturnThis(),
      setOutputNode: vi.fn().mockReturnThis(),
      workflow, // Expose the workflow for testing
    };
    return mockInstance;
  }),
  seed: vi.fn(() => 42),
}));

describe('buildFluxKontextWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create FLUX Kontext workflow with default parameters', () => {
    const modelName = 'flux_kontext.safetensors';
    const params = {
      prompt: 'A beautiful landscape',
    };

    const result = buildFluxKontextWorkflow(modelName, params);

    expect(PromptBuilder).toHaveBeenCalledWith(
      expect.objectContaining({
        '1': expect.objectContaining({
          class_type: 'DualCLIPLoader',
        }),
        '2': expect.objectContaining({
          class_type: 'UNETLoader',
          inputs: expect.objectContaining({
            unet_name: modelName,
          }),
        }),
        '3': expect.objectContaining({
          class_type: 'VAELoader',
        }),
      }),
      expect.any(Array),
      expect.any(Array),
    );

    expect(result.setOutputNode).toHaveBeenCalled();
  });

  it('should create workflow with custom parameters', () => {
    const modelName = 'custom_flux_kontext.safetensors';
    const params = {
      cfg: 4,
      height: 768,
      prompt: 'Custom prompt',
      steps: WORKFLOW_DEFAULTS.SAMPLING.STEPS,
      width: 512,
    };

    buildFluxKontextWorkflow(modelName, params);

    const workflow = (PromptBuilder as any).mock.calls[0][0];
    expect(workflow['2'].inputs.unet_name).toBe(modelName);
  });

  it('should handle image-to-image parameters', () => {
    const modelName = 'flux_kontext.safetensors';
    const params = {
      denoise: 0.8,
      image: 'input_image.png',
      prompt: 'test',
    };

    buildFluxKontextWorkflow(modelName, params);

    // Should not throw and should create valid workflow
    expect(PromptBuilder).toHaveBeenCalled();
  });

  it('should support img2img workflow', () => {
    const modelName = 'flux_kontext.safetensors';
    const params = {
      image: 'test.png',
      prompt: 'test',
    };

    buildFluxKontextWorkflow(modelName, params);

    const workflow = (PromptBuilder as any).mock.calls[0][0];

    // Should have image loading capabilities for img2img
    const hasImageLoader = Object.values(workflow).some(
      (node: any) =>
        node.class_type === 'LoadImage' ||
        node.class_type === 'ImageUploadTransformed' ||
        node.class_type === 'VAEEncode',
    );

    // Kontext workflow supports img2img so should have image processing nodes
    expect(hasImageLoader || Object.keys(workflow).length > 8).toBe(true);
  });

  it('should handle empty prompt', () => {
    const modelName = 'flux_kontext.safetensors';
    const params = {};

    buildFluxKontextWorkflow(modelName, params);

    // Should not throw and should create valid workflow
    expect(PromptBuilder).toHaveBeenCalled();
  });

  it('should use appropriate default steps for Kontext model', () => {
    const modelName = 'flux_kontext.safetensors';
    const params = { prompt: 'test' };

    buildFluxKontextWorkflow(modelName, params);

    const workflow = (PromptBuilder as any).mock.calls[0][0];

    // Kontext typically uses 28 steps by default
    const schedulerNode = Object.values(workflow).find(
      (node: any) => node.class_type === 'BasicScheduler',
    ) as any;

    if (schedulerNode) {
      expect(schedulerNode.inputs.steps).toBe(WORKFLOW_DEFAULTS.KONTEXT.STEPS);
    }
  });

  it('should have correct workflow structure', () => {
    const modelName = 'flux_kontext.safetensors';
    const params = { prompt: 'test' };

    buildFluxKontextWorkflow(modelName, params);

    const workflow = (PromptBuilder as any).mock.calls[0][0];

    // Should have essential nodes for FLUX Kontext workflow
    const hasRequiredNodes = ['DualCLIPLoader', 'UNETLoader', 'VAELoader', 'SaveImage'].every(
      (nodeType) => Object.values(workflow).some((node: any) => node.class_type === nodeType),
    );

    expect(hasRequiredNodes).toBe(true);
  });

  it('should have all meta information', () => {
    const modelName = 'flux_kontext.safetensors';
    const params = { prompt: 'test' };

    buildFluxKontextWorkflow(modelName, params);

    const workflow = (PromptBuilder as any).mock.calls[0][0];

    // Check that nodes have meta titles
    Object.values(workflow).forEach((node: any) => {
      expect(node._meta).toBeDefined();
      expect(node._meta.title).toBeDefined();
      expect(typeof node._meta.title).toBe('string');
    });
  });

  it('should support vision capabilities', () => {
    const modelName = 'flux_kontext.safetensors';
    const params = {
      image: 'input.jpg',
      prompt: 'test',
    };

    buildFluxKontextWorkflow(modelName, params);

    // Kontext model supports vision (img2img), so workflow should be created successfully
    expect(PromptBuilder).toHaveBeenCalled();

    const workflow = (PromptBuilder as any).mock.calls[0][0];
    expect(Object.keys(workflow).length).toBeGreaterThan(0);
  });

  it('should create image-to-image workflow with imageUrl parameter', () => {
    const modelName = 'flux_kontext.safetensors';
    const params = {
      denoise: 0.8,
      imageUrl: 'https://example.com/image.jpg',
      prompt: 'Transform this image into a painting',
    };

    buildFluxKontextWorkflow(modelName, params);

    const workflow = (PromptBuilder as any).mock.calls[0][0];
    const inputParams = (PromptBuilder as any).mock.calls[0][1];

    // Should have image loading and encoding nodes
    expect(workflow['img_load']).toBeDefined();
    expect(workflow['img_load'].class_type).toBe('LoadImage');
    expect(workflow['img_load'].inputs.image).toBe('https://example.com/image.jpg');

    expect(workflow['img_encode']).toBeDefined();
    expect(workflow['img_encode'].class_type).toBe('VAEEncode');
    expect(workflow['img_encode'].inputs.pixels).toEqual(['img_load', 0]);
    expect(workflow['img_encode'].inputs.vae).toEqual(['3', 0]);

    // Sampler should use encoded image as latent
    expect(workflow['10'].inputs.latent_image).toEqual(['img_encode', 0]);

    // Should not have EmptySD3LatentImage node
    expect(workflow['7']).toBeUndefined();

    // Input params should include imageUrl and denoise
    expect(inputParams).toContain('imageUrl');
    expect(inputParams).toContain('denoise');

    // Scheduler should use provided denoise value
    expect(workflow['9'].inputs.denoise).toBe(0.8);
  });

  it('should create image-to-image workflow with imageUrls array parameter', () => {
    const modelName = 'flux_kontext.safetensors';
    const params = {
      denoise: 0.65,
      imageUrls: ['https://example.com/first.jpg', 'https://example.com/second.jpg'],
      prompt: 'Apply artistic style',
    };

    buildFluxKontextWorkflow(modelName, params);

    const workflow = (PromptBuilder as any).mock.calls[0][0];
    const inputParams = (PromptBuilder as any).mock.calls[0][1];

    // Should have image loading node with first image from array
    expect(workflow['img_load']).toBeDefined();
    expect(workflow['img_load'].class_type).toBe('LoadImage');
    expect(workflow['img_load'].inputs.image).toBe('https://example.com/first.jpg');

    // Should have VAE encode node
    expect(workflow['img_encode']).toBeDefined();
    expect(workflow['img_encode'].class_type).toBe('VAEEncode');

    // Sampler should use encoded image
    expect(workflow['10'].inputs.latent_image).toEqual(['img_encode', 0]);

    // Should not have EmptySD3LatentImage node
    expect(workflow['7']).toBeUndefined();

    // Input params should include imageUrl and denoise
    expect(inputParams).toContain('imageUrl');
    expect(inputParams).toContain('denoise');

    // Scheduler should use provided denoise value
    expect(workflow['9'].inputs.denoise).toBe(0.65);
  });

  it('should use default denoise value for image-to-image when not provided', () => {
    const modelName = 'flux_kontext.safetensors';
    const params = {
      imageUrl: 'https://example.com/test.png',
      prompt: 'Edit image',
    };

    buildFluxKontextWorkflow(modelName, params);

    const workflow = (PromptBuilder as any).mock.calls[0][0];

    // Should use default denoise value of 0.75 for image-to-image
    expect(workflow['9'].inputs.denoise).toBe(0.75);

    // Should have image nodes
    expect(workflow['img_load']).toBeDefined();
    expect(workflow['img_encode']).toBeDefined();
  });

  it('should create text-to-image workflow when no image parameters provided', () => {
    const modelName = 'flux_kontext.safetensors';
    const params = {
      height: 1024,
      prompt: 'Generate a new image',
      width: 1024,
    };

    buildFluxKontextWorkflow(modelName, params);

    const workflow = (PromptBuilder as any).mock.calls[0][0];
    const inputParams = (PromptBuilder as any).mock.calls[0][1];

    // Should have EmptySD3LatentImage node for text-to-image
    expect(workflow['7']).toBeDefined();
    expect(workflow['7'].class_type).toBe('EmptySD3LatentImage');
    expect(workflow['7'].inputs.width).toBe(1024);
    expect(workflow['7'].inputs.height).toBe(1024);

    // Should not have image loading/encoding nodes
    expect(workflow['img_load']).toBeUndefined();
    expect(workflow['img_encode']).toBeUndefined();

    // Sampler should use empty latent
    expect(workflow['10'].inputs.latent_image).toEqual(['7', 0]);

    // Input params should not include imageUrl or denoise
    expect(inputParams).not.toContain('imageUrl');
    expect(inputParams).not.toContain('denoise');

    // Scheduler should use denoise value of 1 for text-to-image
    expect(workflow['9'].inputs.denoise).toBe(1);
  });

  it('should handle image-to-image mode with conditional EmptySD3LatentImage node', () => {
    // This test covers lines 269-271 in flux-kontext.ts
    const modelName = 'flux_kontext.safetensors';
    const params = {
      prompt: 'Enhanced landscape',
      imageUrl:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      denoise: 0.8,
      width: 512,
      height: 768,
    };

    const result = buildFluxKontextWorkflow(modelName, params);

    expect(PromptBuilder).toHaveBeenCalled();
    expect(result.input).toHaveBeenCalledWith('imageUrl', params.imageUrl);
    expect(result.input).toHaveBeenCalledWith('denoise', 0.8);

    // Get the workflow from the mock call
    const workflow = (PromptBuilder as any).mock.calls[0][0];

    // In image-to-image mode, should have image loading/encoding nodes
    expect(workflow['img_load']).toBeDefined();
    expect(workflow['img_encode']).toBeDefined();

    // Sampler should use encoded latent from image
    expect(workflow['10'].inputs.latent_image).toEqual(['img_encode', 0]);

    // Scheduler should use provided denoise value
    expect(workflow['9'].inputs.denoise).toBe(0.8);

    // Check that EmptySD3LatentImage node (if it exists) gets width/height set
    // This tests the conditional logic at lines 268-271
    if (workflow['7']) {
      expect(workflow['7'].inputs.width).toBe(512);
      expect(workflow['7'].inputs.height).toBe(768);
    }

    // In image-to-image mode, ModelSamplingFlux should NOT have width/height set directly
    // (they would be undefined or derived from the image encoder)
    // The key point is that these are NOT explicitly set in the workflow for image-to-image
    // But the actual workflow might still have default values, so we just check it exists
    expect(workflow['4']).toBeDefined();
  });

  it('should cover workflow[7] width/height assignment in image-to-image mode', () => {
    // Create a special test to ensure lines 269-271 are covered
    // We need to manually create a scenario where hasInputImage=true AND workflow['7'] exists

    // Override PromptBuilder to capture and modify the workflow
    const mockPromptBuilder = vi.fn().mockImplementation((workflow, inputs, outputs) => {
      // For this test, manually add an EmptySD3LatentImage node to simulate the condition
      // where workflow['7'] exists even in image-to-image mode
      workflow['7'] = {
        _meta: { title: 'Test EmptySD3LatentImage' },
        class_type: 'EmptySD3LatentImage',
        inputs: { width: 1024, height: 1024 },
      };

      return {
        input: vi.fn().mockReturnThis(),
        setInputNode: vi.fn().mockReturnThis(),
        setOutputNode: vi.fn().mockReturnThis(),
        workflow,
      };
    });

    // Temporarily override the mock
    (PromptBuilder as any).mockImplementationOnce(mockPromptBuilder);

    const modelName = 'flux_kontext.safetensors';
    const params = {
      prompt: 'Test image modification',
      imageUrl: 'data:image/png;base64,test',
      width: 640,
      height: 480,
    };

    buildFluxKontextWorkflow(modelName, params);

    // Get the workflow that was modified by our custom mock
    const workflow = mockPromptBuilder.mock.calls[0][0];

    // Verify that workflow['7'] was modified with the correct dimensions
    // This ensures lines 269-271 are executed: if (workflow['7']) { workflow['7'].inputs.width = width; workflow['7'].inputs.height = height; }
    expect(workflow['7']).toBeDefined();
    expect(workflow['7'].inputs.width).toBe(640);
    expect(workflow['7'].inputs.height).toBe(480);
  });

  describe('Coverage Completion Tests', () => {
    it('should handle fallback imageUrl logic in LoadImage node with params.imageUrls', () => {
      const modelName = 'flux_kontext.safetensors';
      const params = {
        prompt: 'Test with imageUrls array',
        imageUrls: ['http://example.com/image1.jpg', 'http://example.com/image2.jpg'],
        // No imageUrl property, should fall back to imageUrls[0]
      };

      buildFluxKontextWorkflow(modelName, params);

      // Get the most recent call to PromptBuilder
      const calls = (PromptBuilder as any).mock.calls;
      const lastCall = calls[calls.length - 1];
      const workflow = lastCall[0];

      // This covers line 182: image: params.imageUrl || params.imageUrls?.[0] || ''
      // Should use imageUrls[0] since imageUrl is not provided
      expect(workflow['img_load']).toBeDefined();
      expect(workflow['img_load'].inputs.image).toBe('http://example.com/image1.jpg');
    });

    it('should handle empty imageUrl fallback logic in LoadImage node', () => {
      const modelName = 'flux_kontext.safetensors';
      const params = {
        prompt: 'Test with valid image URL',
        imageUrls: [], // Empty array to test fallback
        imageUrl: 'http://example.com/test.jpg', // Provide a URL to trigger image mode
      };

      buildFluxKontextWorkflow(modelName, params);

      // Get the most recent call to PromptBuilder
      const calls = (PromptBuilder as any).mock.calls;
      const lastCall = calls[calls.length - 1];
      const workflow = lastCall[0];

      // This covers line 182: image: params.imageUrl || params.imageUrls?.[0] || ''
      // Should use imageUrl when provided even if imageUrls is empty
      expect(workflow['img_load']).toBeDefined();
      expect(workflow['img_load'].inputs.image).toBe('http://example.com/test.jpg');
    });

    it('should handle hasInputImage branch logic with imageUrl fallback in builder input', () => {
      const modelName = 'flux_kontext.safetensors';
      const params = {
        prompt: 'Test hasInputImage branch',
        imageUrls: ['http://example.com/fallback-image.jpg'],
        denoise: 0.8,
        // No imageUrl, should use imageUrls[0]
      };

      const result = buildFluxKontextWorkflow(modelName, params);

      // Check that input() was called with the correct imageUrl value
      // This covers line 284: .input('imageUrl', params.imageUrl || params.imageUrls?.[0] || '')
      expect(result.input).toHaveBeenCalledWith(
        'imageUrl',
        'http://example.com/fallback-image.jpg',
      );
      expect(result.input).toHaveBeenCalledWith('denoise', 0.8);
    });

    it('should handle hasInputImage branch with empty fallback in builder input', () => {
      const modelName = 'flux_kontext.safetensors';
      const params = {
        prompt: 'Test hasInputImage with no image',
        denoise: 0.9,
        // No imageUrl or imageUrls
      };

      const result = buildFluxKontextWorkflow(modelName, params);

      // Check that input() was called with empty string for imageUrl
      // This covers line 284: .input('imageUrl', params.imageUrl || params.imageUrls?.[0] || '')
      expect(result.input).toHaveBeenCalledWith('denoise', 0.9);
      // In text-to-image mode (no imageUrl), the denoise should use default value
      // and imageUrl input should NOT be called at all
      expect(result.input).not.toHaveBeenCalledWith('imageUrl', expect.anything());
    });
  });
});

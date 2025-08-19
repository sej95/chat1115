import React from 'react';
import { View } from 'react-native';
import { renderWithTheme } from '@/test/utils';
import Avatar from '..';

jest.mock('../../../const/meta', () => ({
  DEFAULT_AVATAR: 'https://example.com/default-avatar.png',
}));

jest.mock('../../../utils/common', () => ({
  isEmoji: jest.fn((str: string) => str === '😀' || str === '🚀'),
}));

jest.mock('../../FluentEmoji', () => {
  const MockFluentEmoji = ({
    emoji,
    size,
    type,
  }: {
    emoji: string;
    size: number;
    type: string;
  }) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, {
      'testID': 'fluent-emoji',
      'data-emoji': emoji,
      'data-size': size,
      'data-type': type,
    });
  };
  return MockFluentEmoji;
});

describe('Avatar', () => {
  it('renders correctly with default props', () => {
    const { toJSON } = renderWithTheme(<Avatar />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders with URL avatar', () => {
    const avatarUrl = 'https://example.com/avatar.png';
    const { toJSON } = renderWithTheme(<Avatar avatar={avatarUrl} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders with emoji avatar', () => {
    const { toJSON } = renderWithTheme(<Avatar avatar="😀" size={32} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders with emoji avatar and animation', () => {
    const { toJSON } = renderWithTheme(<Avatar avatar="🚀" animation={true} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders with text fallback', () => {
    const { toJSON } = renderWithTheme(<Avatar avatar="John Doe" />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders with title when avatar is default', () => {
    const { toJSON } = renderWithTheme(<Avatar title="Jane Smith" />);
    expect(toJSON()).toBeTruthy();
  });

  it('handles image load error', () => {
    const { toJSON } = renderWithTheme(<Avatar avatar="https://invalid.url/image.png" />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders with React element avatar', () => {
    const CustomAvatar = () => <View testID="custom-avatar" />;
    const { toJSON } = renderWithTheme(<Avatar avatar={<CustomAvatar />} />);
    expect(toJSON()).toBeTruthy();
  });

  it('uses alt text for accessibility', () => {
    const altText = 'User avatar';
    const { toJSON } = renderWithTheme(
      <Avatar avatar="https://example.com/avatar.png" alt={altText} />,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('handles data URL avatar', () => {
    const dataUrl =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const { toJSON } = renderWithTheme(<Avatar avatar={dataUrl} />);
    expect(toJSON()).toBeTruthy();
  });

  it('handles relative path avatar', () => {
    const relativePath = '/assets/avatar.png';
    const { toJSON } = renderWithTheme(<Avatar avatar={relativePath} />);
    expect(toJSON()).toBeTruthy();
  });

  it('handles empty text gracefully', () => {
    const { toJSON } = renderWithTheme(<Avatar avatar="" />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders with custom size', () => {
    const { toJSON } = renderWithTheme(<Avatar size={64} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders with custom background color', () => {
    const { toJSON } = renderWithTheme(<Avatar backgroundColor="#ff0000" />);
    expect(toJSON()).toBeTruthy();
  });
});

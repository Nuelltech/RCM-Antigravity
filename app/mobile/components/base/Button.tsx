/**
 * Button Component
 * Wrapper around React Native Paper Button with app theming
 * 
 * Usage:
 *   <Button onPress={handlePress}>Click me</Button>
 *   <Button variant="outlined">Secondary</Button>
 */

import React from 'react';
import { Button as PaperButton } from 'react-native-paper';
import { theme } from '../../ui/theme';

interface ButtonProps {
    children: string;
    onPress: () => void;
    variant?: 'primary' | 'outlined' | 'text';
    loading?: boolean;
    disabled?: boolean;
    icon?: string;
    style?: any;
}

export const Button: React.FC<ButtonProps> = ({
    children,
    onPress,
    variant = 'primary',
    loading = false,
    disabled = false,
    icon,
    style,
}) => {
    const mode = variant === 'primary' ? 'contained' : variant === 'outlined' ? 'outlined' : 'text';

    return (
        <PaperButton
            mode={mode}
            onPress={onPress}
            loading={loading}
            disabled={disabled}
            icon={icon}
            buttonColor={variant === 'primary' ? theme.colors.primary : undefined}
            textColor={variant === 'primary' ? theme.colors.textInverse : theme.colors.primary}
            style={style}
        >
            {children}
        </PaperButton>
    );
};

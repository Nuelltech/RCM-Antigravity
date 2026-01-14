/**
 * TextInput Component
 * Wrapper around React Native Paper TextInput with app theming
 * 
 * Usage:
 *   <TextInput
 *     label="Nome"
 *     value={name}
 *     onChangeText={setName}
 *   />
 */

import React from 'react';
import { TextInput as PaperTextInput } from 'react-native-paper';
import { theme } from '../../ui/theme';

interface TextInputProps {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    secureTextEntry?: boolean;
    keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
    multiline?: boolean;
    error?: boolean;
    disabled?: boolean;
    style?: any;
}

export const TextInput: React.FC<TextInputProps> = ({
    label,
    value,
    onChangeText,
    placeholder,
    secureTextEntry = false,
    keyboardType = 'default',
    multiline = false,
    error = false,
    disabled = false,
    style,
}) => {
    return (
        <PaperTextInput
            label={label}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            secureTextEntry={secureTextEntry}
            keyboardType={keyboardType}
            multiline={multiline}
            error={error}
            disabled={disabled}
            mode="outlined"
            outlineColor={theme.colors.border}
            activeOutlineColor={theme.colors.primary}
            style={style}
        />
    );
};

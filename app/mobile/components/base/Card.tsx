/**
 * Card Component
 * Wrapper around React Native Paper Card with app theming
 * 
 * Usage:
 *   <Card>
 *     <Card.Content>
 *       <Text>Content here</Text>
 *     </Card.Content>
 *   </Card>
 */

import React from 'react';
import { Card as PaperCard } from 'react-native-paper';
import { theme } from '../../ui/theme';

interface CardProps {
    children: React.ReactNode;
    elevation?: number;
    style?: any;
    onPress?: () => void;
}

export const Card: React.FC<CardProps> & {
    Content: typeof PaperCard.Content;
    Title: typeof PaperCard.Title;
    Cover: typeof PaperCard.Cover;
    Actions: typeof PaperCard.Actions;
} = ({
    children,
    elevation = 2,
    style,
    onPress,
}) => {
        return (
            <PaperCard
                elevation={elevation}
                style={[{ backgroundColor: theme.colors.surface }, style]}
                onPress={onPress}
            >
                {children}
            </PaperCard>
        );
    };

// Attach sub-components
Card.Content = PaperCard.Content;
Card.Title = PaperCard.Title;
Card.Cover = PaperCard.Cover;
Card.Actions = PaperCard.Actions;

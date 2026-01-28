/**
 * InventoryList Component
 * Displays list of inventory items with quantity inputs
 * 
 * Usage:
 *   <InventoryList items={items} onUpdateItem={handleUpdate} />
 */

import React, { useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { List, Text } from 'react-native-paper';
import { TextInput } from '../../base';
import { spacing } from '../../../ui/spacing';
import { theme } from '../../../ui/theme';

interface InventoryItem {
    id: number;
    produto: {
        id: number;
        nome: string;
    };
    unidade_medida: string;
    quantidade_contada: number;
    localizacao?: {
        nome: string;
    };
}

interface InventoryListProps {
    items: InventoryItem[];
    onUpdateItem: (itemId: number, quantidade: number) => void;
}

export const InventoryList: React.FC<InventoryListProps> = ({
    items,
    onUpdateItem,
}) => {
    const [quantities, setQuantities] = useState<Record<number, string>>({});

    const handleQuantityChange = (itemId: number, text: string) => {
        setQuantities(prev => ({ ...prev, [itemId]: text }));
    };

    const handleQuantityBlur = (itemId: number) => {
        const text = quantities[itemId];
        if (text !== undefined) {
            const quantidade = parseFloat(text) || 0;
            onUpdateItem(itemId, quantidade);
        }
    };

    const renderItem = ({ item }: { item: InventoryItem }) => {
        const currentValue = quantities[item.id] !== undefined
            ? quantities[item.id]
            : item.quantidade_contada?.toString() || '0';

        return (
            <List.Item
                title={item.produto.nome}
                description={`Unidade: ${item.unidade_medida}${item.localizacao ? ` • ${item.localizacao.nome}` : ''}`}
                left={props => <List.Icon {...props} icon="package-variant" />}
                right={() => (
                    <View style={styles.quantityInput}>
                        <TextInput
                            label="Qtd"
                            value={currentValue}
                            onChangeText={(text) => handleQuantityChange(item.id, text)}
                            // @ts-ignore
                            onBlur={() => handleQuantityBlur(item.id)}
                            keyboardType="numeric"
                            style={styles.input}
                        />
                    </View>
                )}
                style={styles.listItem}
            />
        );
    };

    return (
        <FlatList
            data={items}
            renderItem={renderItem}
            keyExtractor={(item) => item.id.toString()}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Nenhum item no inventário</Text>
                </View>
            }
        />
    );
};

const styles = StyleSheet.create({
    listItem: {
        backgroundColor: theme.colors.surface,
        paddingVertical: spacing.sm,
    },
    separator: {
        height: 1,
        backgroundColor: theme.colors.divider,
    },
    quantityInput: {
        width: 100,
        justifyContent: 'center',
    },
    input: {
        height: 48,
    },
    emptyContainer: {
        padding: spacing.xl,
        alignItems: 'center',
    },
    emptyText: {
        color: theme.colors.textSecondary,
    },
});

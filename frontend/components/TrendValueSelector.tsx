import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export type TrendValueMode = 'max' | 'min' | 'average' | 'primary';

interface TrendValueSelectorProps {
  selectedMode: TrendValueMode;
  onModeChange: (mode: TrendValueMode) => void;
  isDark?: boolean;
  availableTerms?: string[];
}

const colors = {
  primary: '#137fec',
  surface: '#f6f7f8',
  surfaceDark: '#0f172a',
  text: '#0f172a',
  textDark: '#f8fafc',
  textSecondary: '#64748b',
  textSecondaryDark: '#94a3b8',
  border: '#e2e8f0',
  borderDark: '#1e293b',
};

export default function TrendValueSelector({
  selectedMode,
  onModeChange,
  isDark = false,
  availableTerms = []
}: TrendValueSelectorProps) {
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const modeOptions: Array<{ value: TrendValueMode; label: string; description: string; icon: string }> = [
    {
      value: 'max',
      label: 'Maximum',
      description: 'Highest trend value among all terms',
      icon: 'arrow-top-right'
    },
    {
      value: 'min',
      label: 'Minimum',
      description: 'Lowest trend value among all terms',
      icon: 'arrow-bottom-left'
    },
    {
      value: 'average',
      label: 'Average',
      description: 'Mean trend value across all terms',
      icon: 'chart-bar'
    },
    {
      value: 'primary',
      label: 'Primary Term',
      description: 'Only the main search term',
      icon: 'magnify'
    }
  ];

  const currentMode = modeOptions.find(m => m.value === selectedMode);
  const bgColor = isDark ? colors.surfaceDark : colors.surface;
  const textColor = isDark ? colors.textDark : colors.text;
  const secondaryTextColor = isDark ? colors.textSecondaryDark : colors.textSecondary;
  const borderColor = isDark ? colors.borderDark : colors.border;

  return (
    <View style={[styles.container]}>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: bgColor, borderColor }]}
        onPress={() => setDropdownVisible(true)}
      >
        <MaterialCommunityIcons
          name={currentMode?.icon || 'tune'}
          size={18}
          color={colors.primary}
        />
        <View style={styles.buttonContent}>
          <Text style={[styles.buttonLabel, { color: textColor }]}>
            {currentMode?.label || 'Select Mode'}
          </Text>
          <Text style={[styles.buttonDesc, { color: secondaryTextColor }]}>
            Trend Fill Opacity
          </Text>
        </View>
        <MaterialCommunityIcons
          name={dropdownVisible ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={secondaryTextColor}
        />
      </TouchableOpacity>

      <Modal
        visible={dropdownVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setDropdownVisible(false)}
        >
          <View style={[styles.dropdown, { backgroundColor: bgColor, borderColor }]}>
            <View style={[styles.dropdownHeader, { borderColor }]}>
              <Text style={[styles.dropdownTitle, { color: textColor }]}>
                Trend Value Mode
              </Text>
              <Text style={[styles.dropdownSubtitle, { color: secondaryTextColor }]}>
                Choose how to calculate marker opacity on the map
              </Text>
            </View>

            <ScrollView style={styles.optionsList}>
              {modeOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.option,
                    selectedMode === option.value && [styles.optionSelected, { backgroundColor: colors.primary + '15' }],
                    { borderColor }
                  ]}
                  onPress={() => {
                    onModeChange(option.value);
                    setDropdownVisible(false);
                  }}
                >
                  <View style={styles.optionIcon}>
                    <MaterialCommunityIcons
                      name={option.icon}
                      size={24}
                      color={selectedMode === option.value ? colors.primary : secondaryTextColor}
                    />
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={[styles.optionLabel, { color: textColor }]}>
                      {option.label}
                    </Text>
                    <Text style={[styles.optionDescription, { color: secondaryTextColor }]}>
                      {option.description}
                    </Text>
                  </View>
                  {selectedMode === option.value && (
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={24}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={[styles.dropdownFooter, { borderColor }]}>
              <MaterialCommunityIcons
                name="information"
                size={16}
                color={secondaryTextColor}
              />
              <Text style={[styles.footerText, { color: secondaryTextColor }]}>
                This affects the fill opacity of markers on the map. Select max to highlight peak trends.
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
  },
  buttonContent: {
    flex: 1,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  dropdown: {
    borderRadius: 12,
    borderWidth: 1,
    maxHeight: '80%',
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dropdownHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  dropdownSubtitle: {
    fontSize: 12,
  },
  optionsList: {
    paddingVertical: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 8,
    marginVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 12,
  },
  optionSelected: {
    borderWidth: 1,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 12,
  },
  dropdownFooter: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 8,
    alignItems: 'flex-start',
  },
  footerText: {
    fontSize: 11,
    flex: 1,
  },
});

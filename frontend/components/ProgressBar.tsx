import React from 'react';
import { View, Text, StyleSheet, Modal, ActivityIndicator } from 'react-native';
// @ts-ignore

interface ProgressBarProps {
  visible: boolean;
  steps: Array<{
    name: string;
    status: 'pending' | 'in-progress' | 'completed' | 'error';
  }>;
  currentStep: string;
  isDark?: boolean;
}

export default function ProgressBar({ 
  visible, 
  steps, 
  currentStep,
  isDark = false 
}: ProgressBarProps) {
  const colors = {
    bg: isDark ? '#101922' : '#f6f7f8',
    surface: isDark ? '#0f172a' : '#ffffff',
    text: isDark ? '#f8fafc' : '#0f172a',
    textSecondary: isDark ? '#94a3b8' : '#64748b',
    primary: '#3b82f6',
    success: '#22c55e',
    error: '#ef4444',
    pending: '#e2e8f0'
  };

  const getStepColor = (status: 'pending' | 'in-progress' | 'completed' | 'error') => {
    switch (status) {
      case 'completed':
        return colors.success;
      case 'in-progress':
        return colors.primary;
      case 'error':
        return colors.error;
      case 'pending':
      default:
        return colors.pending;
    }
  };

  const getStepIcon = (status: 'pending' | 'in-progress' | 'completed' | 'error') => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'in-progress':
        return '◆';
      case 'error':
        return '✕';
      case 'pending':
      default:
        return '○';
    }
  };

  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const totalSteps = steps.length;
  const progressPercentage = (completedSteps / totalSteps) * 100;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
    >
      <View style={[styles.container, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <Text style={[styles.title, { color: colors.text }]}>
            Processing Data
          </Text>
          
          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View 
              style={[
                styles.progressBar,
                { 
                  width: `${progressPercentage}%`,
                  backgroundColor: colors.primary
                }
              ]} 
            />
          </View>
          
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>
            {completedSteps} of {totalSteps} steps completed
          </Text>

          {/* Current Step */}
          <View style={styles.currentStepContainer}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={[styles.currentStepText, { color: colors.text }]}>
              {currentStep || 'Initializing...'}
            </Text>
          </View>

          {/* Steps List */}
          <View style={styles.stepsList}>
            {steps.map((step, index) => {
              const stepColor = getStepColor(step.status);
              const stepIcon = getStepIcon(step.status);
              const isCurrentStep = step.name === currentStep;
              
              return (
                <View 
                  key={index} 
                  style={[
                    styles.stepItem,
                    isCurrentStep && styles.currentStepItem
                  ]}
                >
                  {/* Connector line */}
                  {index < steps.length - 1 && (
                    <View
                      style={[
                        styles.connector,
                        {
                          backgroundColor:
                            step.status === 'completed' ? colors.success : colors.pending
                        }
                      ]}
                    />
                  )}

                  {/* Step indicator */}
                  <View
                    style={[
                      styles.stepDot,
                      {
                        backgroundColor: stepColor,
                        borderColor: stepColor
                      }
                    ]}
                  >
                    <Text style={[styles.stepIcon, { color: 'white', fontSize: 10, fontWeight: 'bold' }]}>
                      {stepIcon}
                    </Text>
                  </View>

                  {/* Step label */}
                  <Text
                    style={[
                      styles.stepLabel,
                      {
                        color: step.status === 'completed' ? colors.textSecondary : colors.text,
                        fontWeight: step.status === 'in-progress' ? '600' : '400',
                        textDecorationLine: step.status === 'completed' ? 'line-through' : 'none'
                      }
                    ]}
                  >
                    {step.name}
                  </Text>

                  {/* Status indicator for current step */}
                  {isCurrentStep && (
                    <View style={styles.pulse}>
                      <View
                        style={[
                          styles.pulseInner,
                          { backgroundColor: colors.primary }
                        ]}
                      />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  card: {
    borderRadius: 12,
    padding: 24,
    maxWidth: 400,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden'
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
    transition: 'width 0.3s ease'
  },
  progressText: {
    fontSize: 12,
    marginBottom: 16,
    textAlign: 'center'
  },
  currentStepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderRadius: 8,
    marginBottom: 16
  },
  currentStepText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1
  },
  stepsList: {
    gap: 0
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
    position: 'relative'
  },
  currentStepItem: {
    paddingVertical: 12
  },
  connector: {
    position: 'absolute',
    left: 12,
    top: 32,
    width: 2,
    height: 28,
    zIndex: 0
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1
  },
  stepIcon: {
    fontSize: 14
  },
  stepLabel: {
    fontSize: 13,
    flex: 1,
    paddingTop: 6
  },
  pulse: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.2)'
  },
  pulseInner: {
    width: '100%',
    height: '100%',
    borderRadius: 6
  }
});

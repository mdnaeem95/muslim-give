import { Component, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { t } from '../i18n';
import { logger } from '../observability/logger';
import { AppText } from './AppText';
import { lightPalette, minTouchTarget, ruleWidth, space } from '@muslim-give/ui-tokens';

interface Props {
  readonly children: ReactNode;
}

interface State {
  readonly failed: boolean;
}

/**
 * One per tab (spec 6.3): a bug in one screen shows a calm message and a retry instead of a blank
 * app. Only the error's code is logged, never its message or the component stack.
 */
export class TabErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch(error: unknown): void {
    logger.failure('ui.tab_error', error);
  }

  private readonly retry = (): void => {
    this.setState({ failed: false });
  };

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <View style={{ flex: 1, padding: space.lg, gap: space.md, justifyContent: 'center' }}>
        <AppText variant="heading">{t('error.title')}</AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('error.retry')}
          onPress={this.retry}
          style={{
            minHeight: minTouchTarget.android,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: lightPalette.surface,
            borderWidth: ruleWidth,
            borderColor: lightPalette.line,
          }}
        >
          <AppText>{t('error.retry')}</AppText>
        </Pressable>
      </View>
    );
  }
}

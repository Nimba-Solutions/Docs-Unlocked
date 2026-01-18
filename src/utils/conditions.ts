/**
 * Generic condition system foundation
 * Supports extensible condition types - currently implements permissions
 * Future: Can add env, feature flags, dates, user roles, etc.
 */

/**
 * Base condition interface - all condition types must implement this
 */
export interface Condition {
  type: string; // Discriminator: 'permission', 'env', 'feature', etc.
}

/**
 * Result of evaluating a condition
 */
export interface ConditionResult {
  shouldShow: boolean; // Whether content should be visible
  isValid: boolean; // Whether the condition reference is valid
  error?: string; // Optional error message for invalid conditions
}

/**
 * Condition evaluator function signature
 * Each condition type registers an evaluator that knows how to check that type
 */
export type ConditionEvaluator = (condition: Condition) => Promise<ConditionResult>;

/**
 * Condition parser function signature
 * Parses attributes from :::if blocks into condition objects
 */
export type ConditionParser = (attributes: Record<string, string>) => Condition | null;

/**
 * Registry for condition types
 * Maps condition type names to their evaluators and parsers
 */
class ConditionRegistry {
  private evaluators = new Map<string, ConditionEvaluator>();
  private parsers = new Map<string, ConditionParser>();
  
  /**
   * Register a condition type with its evaluator and parser
   */
  register(
    type: string,
    evaluator: ConditionEvaluator,
    parser?: ConditionParser
  ): void {
    this.evaluators.set(type, evaluator);
    if (parser) {
      this.parsers.set(type, parser);
    }
  }
  
  /**
   * Get evaluator for a condition type
   */
  getEvaluator(type: string): ConditionEvaluator | undefined {
    return this.evaluators.get(type);
  }
  
  /**
   * Get parser for a condition type
   */
  getParser(type: string): ConditionParser | undefined {
    return this.parsers.get(type);
  }
  
  /**
   * Evaluate a condition using the appropriate evaluator
   */
  async evaluate(condition: Condition): Promise<ConditionResult> {
    const evaluator = this.evaluators.get(condition.type);
    if (!evaluator) {
      return {
        shouldShow: false,
        isValid: false,
        error: `Unknown condition type: ${condition.type}`
      };
    }
    
    try {
      return await evaluator(condition);
    } catch (error) {
      console.error(`[DocsUnlocked] Error evaluating condition:`, error);
      return {
        shouldShow: false,
        isValid: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Parse attributes into a condition using registered parsers
   * Tries parsers in order until one succeeds
   */
  parse(attributes: Record<string, string>): Condition | null {
    // Try each registered parser
    for (const [_type, parser] of this.parsers.entries()) {
      if (parser) {
        const condition = parser(attributes);
        if (condition) {
          return condition;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Check if a condition type is registered
   */
  hasType(type: string): boolean {
    return this.evaluators.has(type);
  }
}

// Global condition registry instance
export const conditionRegistry = new ConditionRegistry();

/**
 * Logical condition operators
 */
export interface LogicalCondition extends Condition {
  type: 'logical';
  operator: 'all' | 'any' | 'not';
  conditions: Condition[];
}

/**
 * Evaluate a logical condition (all, any, not)
 */
export async function evaluateLogicalCondition(
  condition: Condition
): Promise<ConditionResult> {
  const logical = condition as LogicalCondition;
  if (logical.conditions.length === 0) {
    return { shouldShow: true, isValid: true };
  }
  
  const results = await Promise.all(
    logical.conditions.map(cond => conditionRegistry.evaluate(cond))
  );
  
  const allValid = results.every(r => r.isValid);
  if (!allValid) {
    return { shouldShow: false, isValid: false };
  }
  
  const shouldShowResults = results.map(r => r.shouldShow);
  
  switch (logical.operator) {
    case 'all':
      return { shouldShow: shouldShowResults.every(r => r), isValid: true };
    case 'any':
      return { shouldShow: shouldShowResults.some(r => r), isValid: true };
    case 'not':
      return { shouldShow: !shouldShowResults[0], isValid: true };
    default:
      return { shouldShow: false, isValid: false, error: `Unknown operator: ${logical.operator}` };
  }
}

// Register logical condition evaluator
conditionRegistry.register('logical', evaluateLogicalCondition);

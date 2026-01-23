/**
 * FolliCore Validation Errors
 *
 * Input validation errors for data integrity.
 * These are typically LOW severity as they represent user input issues.
 *
 * @module errors
 */

import { ErrorCode } from './ErrorCodes';
import { FolliCoreError, type IErrorContext } from './FolliCoreError';

// ============================================================================
// GENERIC VALIDATION ERRORS
// ============================================================================

/**
 * Error thrown when a required field is missing
 */
export class RequiredFieldError extends FolliCoreError {
  public readonly fieldName: string;

  constructor(fieldName: string, context: IErrorContext = {}) {
    super(
      ErrorCode.VALIDATION_REQUIRED_FIELD,
      `Required field '${fieldName}' is missing`,
      { ...context, component: context.component ?? 'Validator' }
    );
    this.name = 'RequiredFieldError';
    this.fieldName = fieldName;
  }
}

/**
 * Error thrown when field format is invalid
 */
export class InvalidFormatError extends FolliCoreError {
  public readonly fieldName: string;
  public readonly expectedFormat: string;

  constructor(
    fieldName: string,
    expectedFormat: string,
    context: IErrorContext = {}
  ) {
    super(
      ErrorCode.VALIDATION_INVALID_FORMAT,
      `Field '${fieldName}' has invalid format. Expected: ${expectedFormat}`,
      { ...context, component: context.component ?? 'Validator' }
    );
    this.name = 'InvalidFormatError';
    this.fieldName = fieldName;
    this.expectedFormat = expectedFormat;
  }
}

/**
 * Error thrown when value is out of allowed range
 */
export class OutOfRangeError extends FolliCoreError {
  public readonly fieldName: string;
  public readonly min?: number;
  public readonly max?: number;
  public readonly actualValue: number;

  constructor(
    fieldName: string,
    actualValue: number,
    min?: number,
    max?: number,
    context: IErrorContext = {}
  ) {
    const rangeStr =
      min !== undefined && max !== undefined
        ? `[${min}, ${max}]`
        : min !== undefined
          ? `>= ${min}`
          : max !== undefined
            ? `<= ${max}`
            : 'valid range';

    super(
      ErrorCode.VALIDATION_OUT_OF_RANGE,
      `Field '${fieldName}' value ${actualValue} is out of range ${rangeStr}`,
      { ...context, component: context.component ?? 'Validator' }
    );
    this.name = 'OutOfRangeError';
    this.fieldName = fieldName;
    this.min = min;
    this.max = max;
    this.actualValue = actualValue;
  }
}

/**
 * Error thrown when field type is invalid
 */
export class InvalidTypeError extends FolliCoreError {
  public readonly fieldName: string;
  public readonly expectedType: string;
  public readonly actualType: string;

  constructor(
    fieldName: string,
    expectedType: string,
    actualType: string,
    context: IErrorContext = {}
  ) {
    super(
      ErrorCode.VALIDATION_INVALID_TYPE,
      `Field '${fieldName}' has invalid type. Expected: ${expectedType}, Got: ${actualType}`,
      { ...context, component: context.component ?? 'Validator' }
    );
    this.name = 'InvalidTypeError';
    this.fieldName = fieldName;
    this.expectedType = expectedType;
    this.actualType = actualType;
  }
}

// ============================================================================
// TRICHOLOGY-SPECIFIC VALIDATION ERRORS
// ============================================================================

/**
 * Error thrown when scalp zone is invalid
 */
export class InvalidZoneError extends FolliCoreError {
  public readonly zone: string;
  public readonly validZones: string[];

  constructor(
    zone: string,
    validZones: string[] = ['temporal', 'parietal', 'occipital', 'frontal', 'vertex'],
    context: IErrorContext = {}
  ) {
    super(
      ErrorCode.VALIDATION_INVALID_ZONE,
      `Invalid scalp zone '${zone}'. Valid zones: ${validZones.join(', ')}`,
      { ...context, component: context.component ?? 'ZoneValidator' }
    );
    this.name = 'InvalidZoneError';
    this.zone = zone;
    this.validZones = validZones;
  }
}

/**
 * Error thrown when patient age is invalid
 */
export class InvalidAgeError extends FolliCoreError {
  public readonly age: number;
  public readonly minAge: number;
  public readonly maxAge: number;

  constructor(
    age: number,
    minAge = 0,
    maxAge = 120,
    context: IErrorContext = {}
  ) {
    super(
      ErrorCode.VALIDATION_INVALID_AGE,
      `Invalid age ${age}. Must be between ${minAge} and ${maxAge}`,
      { ...context, component: context.component ?? 'PatientValidator' }
    );
    this.name = 'InvalidAgeError';
    this.age = age;
    this.minAge = minAge;
    this.maxAge = maxAge;
  }
}

/**
 * Error thrown when gender value is invalid
 */
export class InvalidGenderError extends FolliCoreError {
  public readonly gender: string;
  public readonly validGenders: string[];

  constructor(
    gender: string,
    validGenders: string[] = ['male', 'female'],
    context: IErrorContext = {}
  ) {
    super(
      ErrorCode.VALIDATION_INVALID_GENDER,
      `Invalid gender '${gender}'. Valid values: ${validGenders.join(', ')}`,
      { ...context, component: context.component ?? 'PatientValidator' }
    );
    this.name = 'InvalidGenderError';
    this.gender = gender;
    this.validGenders = validGenders;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate required fields in an object
 *
 * @throws RequiredFieldError if any field is missing
 */
export function validateRequiredFields<T extends Record<string, unknown>>(
  obj: T,
  requiredFields: (keyof T)[],
  context: IErrorContext = {}
): void {
  for (const field of requiredFields) {
    // eslint-disable-next-line security/detect-object-injection -- field is from typed keyof T, not user input
    const value = obj[field];
    if (value === undefined || value === null) {
      throw new RequiredFieldError(String(field), context);
    }
  }
}

/**
 * Validate numeric range
 *
 * @throws OutOfRangeError if value is out of range
 */
export function validateRange(
  fieldName: string,
  value: number,
  min?: number,
  max?: number,
  context: IErrorContext = {}
): void {
  if (min !== undefined && value < min) {
    throw new OutOfRangeError(fieldName, value, min, max, context);
  }
  if (max !== undefined && value > max) {
    throw new OutOfRangeError(fieldName, value, min, max, context);
  }
}

/**
 * Validate scalp zone
 *
 * @throws InvalidZoneError if zone is invalid
 */
export function validateZone(
  zone: string,
  context: IErrorContext = {}
): asserts zone is 'temporal' | 'parietal' | 'occipital' | 'frontal' | 'vertex' {
  const validZones = ['temporal', 'parietal', 'occipital', 'frontal', 'vertex'];
  if (!validZones.includes(zone)) {
    throw new InvalidZoneError(zone, validZones, context);
  }
}

/**
 * Validate gender
 *
 * @throws InvalidGenderError if gender is invalid
 */
export function validateGender(
  gender: string,
  context: IErrorContext = {}
): asserts gender is 'male' | 'female' {
  const validGenders = ['male', 'female'];
  if (!validGenders.includes(gender)) {
    throw new InvalidGenderError(gender, validGenders, context);
  }
}

/**
 * Validate age for PGMU norms
 *
 * @throws InvalidAgeError if age is out of supported range
 */
export function validateAge(
  age: number,
  minAge = 18,
  maxAge = 100,
  context: IErrorContext = {}
): void {
  if (age < minAge || age > maxAge || !Number.isInteger(age)) {
    throw new InvalidAgeError(age, minAge, maxAge, context);
  }
}

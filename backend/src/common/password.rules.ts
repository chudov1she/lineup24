import { Matches, MaxLength, MinLength } from 'class-validator';

/** Min 8, letter + digit + special — shared by register/reset/change. */
export const PASSWORD_PATTERN =
  /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).{8,128}$/;

export const PASSWORD_RULE_MESSAGE =
  'Пароль: минимум 8 символов, хотя бы одна буква, одна цифра и один спецсимвол';

export function PasswordRules(): PropertyDecorator {
  return (target, propertyKey) => {
    MinLength(8, { message: PASSWORD_RULE_MESSAGE })(target, propertyKey);
    MaxLength(128, {
      message: 'Пароль не должен быть длиннее 128 символов',
    })(target, propertyKey);
    Matches(PASSWORD_PATTERN, { message: PASSWORD_RULE_MESSAGE })(
      target,
      propertyKey,
    );
  };
}

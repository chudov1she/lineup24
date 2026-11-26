import { describe, expect, it } from 'vitest';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { AcceptLegalDto } from './dto/accept-legal.dto.js';
import { RegisterDto } from './dto/register.dto.js';

describe('legal acceptance DTOs', () => {
  it('rejects register without tos/privacy accept', async () => {
    const dto = plainToInstance(RegisterDto, {
      username: 'tester',
      email: 'tester@example.com',
      password: 'Password123!',
      tosAccepted: false,
      privacyAccepted: true,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('accepts register with both legal flags', async () => {
    const dto = plainToInstance(RegisterDto, {
      username: 'tester',
      email: 'tester@example.com',
      password: 'Password123!',
      tosAccepted: true,
      privacyAccepted: true,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('requires true for accept-legal', async () => {
    const dto = plainToInstance(AcceptLegalDto, {
      tosAccepted: false,
      privacyAccepted: true,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});

import { Equals } from 'class-validator';

export class AcceptLegalDto {
  @Equals(true)
  tosAccepted!: boolean;

  @Equals(true)
  privacyAccepted!: boolean;
}

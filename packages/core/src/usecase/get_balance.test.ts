import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { when } from 'vitest-when';
import { LedgerRepository } from '../repository/ledger_repository';
import { GetBalance } from './get_balance';

describe('GetBalance', () => {
  function makeSut() {
    const ledgerRepository = mock<LedgerRepository>();
    const sut = new GetBalance({ ledgerRepository });
    return { sut, ledgerRepository };
  }

  it('should return the summed balance in BRL cents', async () => {
    // Given
    const { sut, ledgerRepository } = makeSut();
    when(ledgerRepository.getBalance).calledWith().thenResolve(18500);

    // When
    const result = await sut.execute();

    // Then
    expect(result).toEqual({ balanceBrlCents: 18500 });
  });

  it('should return zero when the ledger is empty', async () => {
    // Given
    const { sut, ledgerRepository } = makeSut();
    when(ledgerRepository.getBalance).calledWith().thenResolve(0);

    // When
    const result = await sut.execute();

    // Then
    expect(result).toEqual({ balanceBrlCents: 0 });
  });
});

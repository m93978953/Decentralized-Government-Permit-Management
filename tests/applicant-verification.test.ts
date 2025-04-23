import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the Clarity contract environment
const mockContractEnv = () => {
  const state = {
    applicants: new Map(),
    admin: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM', // Mock admin address
    txSender: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM', // Default tx-sender
    blockHeight: 100, // Mock block height
  };
  
  return {
    state,
    setTxSender: (sender) => {
      state.txSender = sender;
    },
    // Mock contract functions
    registerApplicant: (id, name, address) => {
      if (state.applicants.has(id)) {
        return { err: 1 };
      }
      state.applicants.set(id, {
        name,
        address,
        verified: false,
        'verification-date': null
      });
      return { ok: true };
    },
    verifyApplicant: (id) => {
      if (state.txSender !== state.admin) {
        return { err: 3 };
      }
      if (!state.applicants.has(id)) {
        return { err: 2 };
      }
      const applicant = state.applicants.get(id);
      applicant.verified = true;
      applicant['verification-date'] = state.blockHeight; // Use mock block height
      state.applicants.set(id, applicant);
      return { ok: true };
    },
    isVerified: (id) => {
      if (!state.applicants.has(id)) {
        return { err: 2 };
      }
      return { ok: state.applicants.get(id).verified };
    },
    getApplicant: (id) => {
      return state.applicants.get(id) || null;
    },
    setAdmin: (newAdmin) => {
      if (state.txSender !== state.admin) {
        return { err: 3 };
      }
      state.admin = newAdmin;
      return { ok: true };
    }
  };
};

describe('Applicant Verification Contract', () => {
  let contract;
  
  beforeEach(() => {
    contract = mockContractEnv();
  });
  
  it('should register a new applicant', () => {
    const result = contract.registerApplicant(
        'app-123',
        'John Doe',
        '123 Main St'
    );
    
    expect(result).toEqual({ ok: true });
    expect(contract.state.applicants.has('app-123')).toBe(true);
    expect(contract.state.applicants.get('app-123').verified).toBe(false);
  });
  
  it('should not register an applicant twice', () => {
    contract.registerApplicant('app-123', 'John Doe', '123 Main St');
    const result = contract.registerApplicant('app-123', 'John Doe', '123 Main St');
    
    expect(result).toEqual({ err: 1 });
  });
  
  it('should verify an applicant as admin', () => {
    contract.registerApplicant('app-123', 'John Doe', '123 Main St');
    const result = contract.verifyApplicant('app-123');
    
    expect(result).toEqual({ ok: true });
    expect(contract.state.applicants.get('app-123').verified).toBe(true);
    expect(contract.state.applicants.get('app-123')['verification-date']).toBe(contract.state.blockHeight);
  });
  
  it('should not verify a non-existent applicant', () => {
    const result = contract.verifyApplicant('non-existent');
    
    expect(result).toEqual({ err: 2 });
  });
  
  it('should not allow non-admin to verify applicant', () => {
    contract.registerApplicant('app-123', 'John Doe', '123 Main St');
    contract.setTxSender('ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG'); // Non-admin
    
    const result = contract.verifyApplicant('app-123');
    
    expect(result).toEqual({ err: 3 });
    expect(contract.state.applicants.get('app-123').verified).toBe(false);
  });
  
  it('should check if an applicant is verified', () => {
    contract.registerApplicant('app-123', 'John Doe', '123 Main St');
    contract.verifyApplicant('app-123');
    
    const result = contract.isVerified('app-123');
    
    expect(result).toEqual({ ok: true });
  });
  
  it('should return applicant details', () => {
    contract.registerApplicant('app-123', 'John Doe', '123 Main St');
    
    const applicant = contract.getApplicant('app-123');
    
    expect(applicant).toEqual({
      name: 'John Doe',
      address: '123 Main St',
      verified: false,
      'verification-date': null
    });
  });
  
  it('should allow admin to set a new admin', () => {
    const newAdmin = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
    
    const result = contract.setAdmin(newAdmin);
    
    expect(result).toEqual({ ok: true });
    expect(contract.state.admin).toBe(newAdmin);
  });
  
  it('should not allow non-admin to set a new admin', () => {
    contract.setTxSender('ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG'); // Non-admin
    
    const result = contract.setAdmin('ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5YC7SG3A1');
    
    expect(result).toEqual({ err: 3 });
    expect(contract.state.admin).toBe('ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'); // Unchanged
  });
});

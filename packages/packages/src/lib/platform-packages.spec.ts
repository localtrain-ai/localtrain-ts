import { platformPackages } from './platform-packages';

describe('platformPackages', () => {
  it('should work', () => {
    expect(platformPackages()).toEqual('platform-packages');
  });
});

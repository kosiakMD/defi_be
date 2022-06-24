import { getBestSymbolName } from '../../../../src/modules/assets/services/asset-analyser.service';

describe('AssetAnalyserService tests', () => {
  describe('utils', () => {
    describe('getBestSymbolName', () => {
      it('test', async () => {
        expect(getBestSymbolName('test', 'Test')).toBe('Test');
        expect(getBestSymbolName('test', undefined)).toBe('test');
        expect(getBestSymbolName(null, undefined)).toBe(undefined);
        expect(getBestSymbolName('null-null', 'Undefined-null')).toBe('Undefined-null');
      });
    });
  });
});

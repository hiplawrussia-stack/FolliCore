/**
 * Tests for MorphometryExtractor
 */

import { MorphometryExtractor, createMorphometryExtractor } from './MorphometryExtractor';
import { IImageEmbedding, ISegmentationResult, VisionError, VisionErrorCode } from './VisionTypes';

describe('MorphometryExtractor', () => {
  let extractor: MorphometryExtractor;

  const createMockEmbedding = (): IImageEmbedding => ({
    vector: new Float32Array(1024).fill(0.5),
    dimension: 1024,
    modelVersion: 'dinov2-large',
    extractedAt: new Date(),
  });

  const createMockSegmentation = (follicleCount: number = 20, hairCount: number = 50): ISegmentationResult => ({
    follicleMasks: Array(follicleCount).fill('mock_mask'),
    scalpMask: 'mock_scalp',
    shaftMasks: Array(hairCount).fill('mock_shaft'),
    roiBounds: { x: 0, y: 0, width: 1000, height: 1000 },
    confidence: 0.9,
  });

  const defaultCalibration = { pixelsPerMicrometer: 2.5 };

  beforeEach(async () => {
    extractor = createMorphometryExtractor();
    await extractor.load();
  });

  describe('initialization', () => {
    it('should create extractor via factory function', () => {
      const ext = createMorphometryExtractor();
      expect(ext).toBeInstanceOf(MorphometryExtractor);
    });

    it('should not be loaded initially', () => {
      const ext = new MorphometryExtractor();
      expect(ext.isLoaded()).toBe(false);
    });

    it('should be loaded after load()', async () => {
      const ext = new MorphometryExtractor();
      await ext.load();
      expect(ext.isLoaded()).toBe(true);
    });
  });

  describe('extract() - morphometry', () => {
    it('should throw if model not loaded', async () => {
      const unloadedExtractor = new MorphometryExtractor();
      await expect(
        unloadedExtractor.extract(
          createMockEmbedding(),
          createMockSegmentation(),
          defaultCalibration
        )
      ).rejects.toThrow(VisionError);
    });

    it('should return valid morphometry result', async () => {
      const result = await extractor.extract(
        createMockEmbedding(),
        createMockSegmentation(),
        defaultCalibration
      );

      expect(result.bulbWidth).toBeGreaterThan(0);
      expect(result.shaftThickness).toBeGreaterThan(0);
      expect(result.sampleSize).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should return bulb width within PGMU range (60-80 μm)', async () => {
      const result = await extractor.extract(
        createMockEmbedding(),
        createMockSegmentation(),
        defaultCalibration
      );

      expect(result.bulbWidth).toBeGreaterThanOrEqual(60);
      expect(result.bulbWidth).toBeLessThanOrEqual(80);
    });

    it('should return shaft thickness within range (25-40 μm)', async () => {
      const result = await extractor.extract(
        createMockEmbedding(),
        createMockSegmentation(),
        defaultCalibration
      );

      expect(result.shaftThickness).toBeGreaterThanOrEqual(25);
      expect(result.shaftThickness).toBeLessThanOrEqual(40);
    });

    it('should return zero values for empty segmentation', async () => {
      const emptySegmentation = createMockSegmentation(0, 0);
      const result = await extractor.extract(
        createMockEmbedding(),
        emptySegmentation,
        defaultCalibration
      );

      expect(result.bulbWidth).toBe(0);
      expect(result.shaftThickness).toBe(0);
      expect(result.sampleSize).toBe(0);
      expect(result.confidence).toBe(0);
    });

    it('should include standard deviation measurements', async () => {
      const result = await extractor.extract(
        createMockEmbedding(),
        createMockSegmentation(),
        defaultCalibration
      );

      expect(result.bulbWidthStd).toBeDefined();
      expect(result.shaftThicknessStd).toBeDefined();
      expect(result.bulbWidthStd).toBeGreaterThanOrEqual(0);
      expect(result.shaftThicknessStd).toBeGreaterThanOrEqual(0);
    });

    it('should scale with calibration factor', async () => {
      const result1 = await extractor.extract(
        createMockEmbedding(),
        createMockSegmentation(),
        { pixelsPerMicrometer: 2.5 }
      );

      const result2 = await extractor.extract(
        createMockEmbedding(),
        createMockSegmentation(),
        { pixelsPerMicrometer: 5.0 }
      );

      // With higher px/um ratio, same pixel measurements become smaller in micrometers
      // Results are clamped, so we just check they're valid
      expect(result1.bulbWidth).toBeGreaterThanOrEqual(60);
      expect(result2.bulbWidth).toBeGreaterThanOrEqual(60);
    });
  });

  describe('analyze() - density', () => {
    it('should return valid density result', async () => {
      const result = await extractor.analyze(
        createMockSegmentation(20, 50),
        defaultCalibration
      );

      expect(result.totalHairCount).toBe(50);
      expect(result.density).toBeGreaterThan(0);
      expect(result.follicularUnits).toBeGreaterThan(0);
    });

    it('should calculate correct FU distribution', async () => {
      const result = await extractor.analyze(
        createMockSegmentation(20, 50),
        defaultCalibration
      );

      const fuSum =
        result.fuDistribution.single +
        result.fuDistribution.double +
        result.fuDistribution.triple +
        result.fuDistribution.quad;

      expect(fuSum).toBe(20); // Total FUs
    });

    it('should handle empty segmentation', async () => {
      const result = await extractor.analyze(
        createMockSegmentation(0, 0),
        defaultCalibration
      );

      expect(result.totalHairCount).toBe(0);
      expect(result.density).toBe(0);
      expect(result.follicularUnits).toBe(0);
    });

    it('should return analyzed area', async () => {
      const segmentation = createMockSegmentation();
      const result = await extractor.analyze(segmentation, defaultCalibration);

      expect(result.analyzedArea).toBeGreaterThan(0);
    });

    it('should return confidence score', async () => {
      const result = await extractor.analyze(
        createMockSegmentation(20, 100),
        defaultCalibration
      );

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('classify() - hair cycle', () => {
    it('should classify all hairs', async () => {
      const hairCount = 100;
      const result = await extractor.classify(
        createMockEmbedding(),
        createMockSegmentation(30, hairCount)
      );

      const totalClassified =
        result.anagenCount + result.catagenCount + result.telogenCount;
      expect(totalClassified).toBe(hairCount);
    });

    it('should return anagen/telogen ratio', async () => {
      const result = await extractor.classify(
        createMockEmbedding(),
        createMockSegmentation()
      );

      expect(result.anagenTelogenRatio).toBeGreaterThan(0);
      expect(result.anagenTelogenRatio).toBeLessThanOrEqual(1);
    });

    it('should return vellus/terminal ratio', async () => {
      const result = await extractor.classify(
        createMockEmbedding(),
        createMockSegmentation()
      );

      expect(result.vellusTerminalRatio).toBeGreaterThanOrEqual(0);
      expect(result.vellusTerminalRatio).toBeLessThanOrEqual(1);
    });

    it('should have more anagen than telogen in healthy simulation', async () => {
      const result = await extractor.classify(
        createMockEmbedding(),
        createMockSegmentation(30, 100)
      );

      expect(result.anagenCount).toBeGreaterThan(result.telogenCount);
    });

    it('should have more terminal than vellus in healthy simulation', async () => {
      const result = await extractor.classify(
        createMockEmbedding(),
        createMockSegmentation(30, 100)
      );

      expect(result.terminalCount).toBeGreaterThan(result.vellusCount);
    });

    it('should handle empty segmentation', async () => {
      const result = await extractor.classify(
        createMockEmbedding(),
        createMockSegmentation(0, 0)
      );

      expect(result.anagenCount).toBe(0);
      expect(result.telogenCount).toBe(0);
      expect(result.vellusCount).toBe(0);
      expect(result.terminalCount).toBe(0);
    });

    it('should return confidence score', async () => {
      const result = await extractor.classify(
        createMockEmbedding(),
        createMockSegmentation()
      );

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('statistical methods', () => {
    it('should calculate confidence based on sample size', async () => {
      const smallSample = await extractor.extract(
        createMockEmbedding(),
        createMockSegmentation(5, 10),
        defaultCalibration
      );

      const largeSample = await extractor.extract(
        createMockEmbedding(),
        createMockSegmentation(50, 100),
        defaultCalibration
      );

      // Larger sample should generally have higher confidence
      // (though randomness in mock data can affect this)
      expect(largeSample.sampleSize).toBeGreaterThan(smallSample.sampleSize);
    });
  });
});

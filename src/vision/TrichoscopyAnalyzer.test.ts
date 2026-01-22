/**
 * Tests for TrichoscopyAnalyzer
 */

import {
  TrichoscopyAnalyzer,
  createMockAnalyzer,
  type IFeatureExtractor,
  type ISegmentationModel,
  type IMorphometryHead,
  type IDensityHead,
  type ICycleHead,
} from './TrichoscopyAnalyzer';
import {
  type ITrichoscopyImage,
  type IImageEmbedding,
  type ISegmentationResult,
  type IMorphometryResult,
  type IDensityResult,
  type ICycleAnalysis,
  VisionError,
  DEFAULT_VISION_CONFIG,
} from './VisionTypes';

describe('TrichoscopyAnalyzer', () => {
  // Mock implementations
  const createMockFeatureExtractor = (): IFeatureExtractor => ({
    extract: jest.fn().mockResolvedValue({
      vector: new Float32Array(1024).fill(0.5),
      dimension: 1024,
      modelVersion: 'dinov2-large',
      extractedAt: new Date(),
    } as IImageEmbedding),
    isLoaded: jest.fn().mockReturnValue(true),
    load: jest.fn().mockResolvedValue(undefined),
    unload: jest.fn().mockResolvedValue(undefined),
  });

  const createMockSegmentationModel = (): ISegmentationModel => ({
    segment: jest.fn().mockResolvedValue({
      follicleMasks: ['mask1', 'mask2'],
      scalpMask: 'scalp',
      shaftMasks: ['shaft1', 'shaft2', 'shaft3'],
      roiBounds: { x: 0, y: 0, width: 1000, height: 1000 },
      confidence: 0.9,
    } as ISegmentationResult),
    segmentWithPoints: jest.fn().mockResolvedValue({
      follicleMasks: ['mask1'],
      scalpMask: 'scalp',
      shaftMasks: ['shaft1'],
      roiBounds: { x: 100, y: 100, width: 500, height: 500 },
      confidence: 0.95,
    } as ISegmentationResult),
    isLoaded: jest.fn().mockReturnValue(true),
    load: jest.fn().mockResolvedValue(undefined),
    unload: jest.fn().mockResolvedValue(undefined),
  });

  const createMockMorphometryHead = (): IMorphometryHead => ({
    extract: jest.fn().mockResolvedValue({
      bulbWidth: 72.5,
      shaftThickness: 32.0,
      bulbWidthStd: 2.0,
      shaftThicknessStd: 1.5,
      sampleSize: 25,
      confidence: 0.85,
    } as IMorphometryResult),
    isLoaded: jest.fn().mockReturnValue(true),
    load: jest.fn().mockResolvedValue(undefined),
  });

  const createMockDensityHead = (): IDensityHead => ({
    analyze: jest.fn().mockResolvedValue({
      totalHairCount: 150,
      density: 180,
      follicularUnits: 75,
      fuDistribution: { single: 20, double: 35, triple: 15, quad: 5 },
      analyzedArea: 0.5,
      confidence: 0.88,
    } as IDensityResult),
  });

  const createMockCycleHead = (): ICycleHead => ({
    classify: jest.fn().mockResolvedValue({
      anagenCount: 85,
      catagenCount: 2,
      telogenCount: 13,
      anagenTelogenRatio: 0.87,
      vellusCount: 15,
      terminalCount: 85,
      vellusTerminalRatio: 0.15,
      confidence: 0.82,
    } as ICycleAnalysis),
    isLoaded: jest.fn().mockReturnValue(true),
    load: jest.fn().mockResolvedValue(undefined),
  });

  const createMockImage = (): ITrichoscopyImage => ({
    data: 'base64mockdata',
    format: 'png',
    width: 1024,
    height: 768,
    magnification: 50,
    zone: 'temporal',
    capturedAt: new Date(),
  });

  let analyzer: TrichoscopyAnalyzer;

  beforeEach(async () => {
    analyzer = new TrichoscopyAnalyzer();
    await analyzer.initialize({
      featureExtractor: createMockFeatureExtractor(),
      segmentationModel: createMockSegmentationModel(),
      morphometryHead: createMockMorphometryHead(),
      densityHead: createMockDensityHead(),
      cycleHead: createMockCycleHead(),
    });
  });

  describe('initialization', () => {
    it('should create analyzer with default config', () => {
      const an = new TrichoscopyAnalyzer();
      expect(an).toBeInstanceOf(TrichoscopyAnalyzer);
      expect(an.isReady()).toBe(false);
    });

    it('should create analyzer via factory function', () => {
      const an = createMockAnalyzer();
      expect(an).toBeInstanceOf(TrichoscopyAnalyzer);
    });

    it('should accept custom config', () => {
      const an = new TrichoscopyAnalyzer({
        featureExtractor: {
          ...DEFAULT_VISION_CONFIG.featureExtractor,
          model: 'dinov2-base',
        },
      });
      const config = an.getConfig();
      expect(config.featureExtractor.model).toBe('dinov2-base');
    });

    it('should be ready after initialization', async () => {
      const an = new TrichoscopyAnalyzer();
      expect(an.isReady()).toBe(false);

      await an.initialize({
        featureExtractor: createMockFeatureExtractor(),
        segmentationModel: createMockSegmentationModel(),
        morphometryHead: createMockMorphometryHead(),
        densityHead: createMockDensityHead(),
        cycleHead: createMockCycleHead(),
      });

      expect(an.isReady()).toBe(true);
    });

    it('should load all models during initialization', async () => {
      const featureExtractor = createMockFeatureExtractor();
      const segmentationModel = createMockSegmentationModel();
      const morphometryHead = createMockMorphometryHead();
      const cycleHead = createMockCycleHead();

      const an = new TrichoscopyAnalyzer();
      await an.initialize({
        featureExtractor,
        segmentationModel,
        morphometryHead,
        densityHead: createMockDensityHead(),
        cycleHead,
      });

      expect(featureExtractor.load).toHaveBeenCalled();
      expect(segmentationModel.load).toHaveBeenCalled();
      expect(morphometryHead.load).toHaveBeenCalled();
      expect(cycleHead.load).toHaveBeenCalled();
    });
  });

  describe('analyze()', () => {
    it('should throw if not initialized', async () => {
      const uninitializedAnalyzer = new TrichoscopyAnalyzer();
      await expect(uninitializedAnalyzer.analyze(createMockImage())).rejects.toThrow(VisionError);
    });

    it('should return complete analysis result', async () => {
      const result = await analyzer.analyze(createMockImage());

      expect(result.analysisId).toBeDefined();
      expect(result.imageId).toBeDefined();
      expect(result.zone).toBe('temporal');
      expect(result.analyzedAt).toBeInstanceOf(Date);
    });

    it('should include embedding', async () => {
      const result = await analyzer.analyze(createMockImage());

      expect(result.embedding).toBeDefined();
      expect(result.embedding.vector).toBeInstanceOf(Float32Array);
      expect(result.embedding.dimension).toBe(1024);
    });

    it('should include morphometry', async () => {
      const result = await analyzer.analyze(createMockImage());

      expect(result.morphometry).toBeDefined();
      expect(result.morphometry.bulbWidth).toBeGreaterThan(0);
      expect(result.morphometry.shaftThickness).toBeGreaterThan(0);
    });

    it('should include density analysis', async () => {
      const result = await analyzer.analyze(createMockImage());

      expect(result.density).toBeDefined();
      expect(result.density.density).toBeGreaterThan(0);
      expect(result.density.follicularUnits).toBeGreaterThan(0);
    });

    it('should include cycle analysis', async () => {
      const result = await analyzer.analyze(createMockImage());

      expect(result.cycleAnalysis).toBeDefined();
      expect(result.cycleAnalysis.anagenTelogenRatio).toBeGreaterThan(0);
    });

    it('should include segmentation', async () => {
      const result = await analyzer.analyze(createMockImage());

      expect(result.segmentation).toBeDefined();
      expect(result.segmentation.follicleMasks.length).toBeGreaterThan(0);
    });

    it('should calculate overall confidence', async () => {
      const result = await analyzer.analyze(createMockImage());

      expect(result.overallConfidence).toBeGreaterThan(0);
      expect(result.overallConfidence).toBeLessThanOrEqual(1);
    });

    it('should track processing time', async () => {
      const result = await analyzer.analyze(createMockImage());

      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should include model versions', async () => {
      const result = await analyzer.analyze(createMockImage());

      expect(result.modelVersions).toBeDefined();
      expect(result.modelVersions.featureExtractor).toBeDefined();
      expect(result.modelVersions.segmentationModel).toBeDefined();
    });
  });

  describe('image validation', () => {
    it('should reject empty image data', async () => {
      const badImage = { ...createMockImage(), data: '' };
      await expect(analyzer.analyze(badImage)).rejects.toThrow(VisionError);
    });

    it('should reject unsupported format', async () => {
      const badImage = { ...createMockImage(), format: 'bmp' as any };
      await expect(analyzer.analyze(badImage)).rejects.toThrow(VisionError);
    });

    it('should reject too small images', async () => {
      const smallImage = { ...createMockImage(), width: 100, height: 100 };
      await expect(analyzer.analyze(smallImage)).rejects.toThrow(VisionError);
    });

    it('should accept valid image formats', async () => {
      const pngImage = { ...createMockImage(), format: 'png' as const };
      const jpegImage = { ...createMockImage(), format: 'jpeg' as const };
      const tiffImage = { ...createMockImage(), format: 'tiff' as const };

      await expect(analyzer.analyze(pngImage)).resolves.toBeDefined();
      await expect(analyzer.analyze(jpegImage)).resolves.toBeDefined();
      await expect(analyzer.analyze(tiffImage)).resolves.toBeDefined();
    });
  });

  describe('analyzeBatch()', () => {
    it('should analyze multiple images', async () => {
      const images = [
        createMockImage(),
        { ...createMockImage(), zone: 'parietal' as const },
        { ...createMockImage(), zone: 'frontal' as const },
      ];

      const results = await analyzer.analyzeBatch(images);

      expect(results).toHaveLength(3);
      expect(results[0].zone).toBe('temporal');
      expect(results[1].zone).toBe('parietal');
      expect(results[2].zone).toBe('frontal');
    });

    it('should handle empty array', async () => {
      const results = await analyzer.analyzeBatch([]);
      expect(results).toHaveLength(0);
    });
  });

  describe('interactiveSegment()', () => {
    it('should perform interactive segmentation with points', async () => {
      const image = createMockImage();
      const points = [
        { x: 100, y: 100, label: 'foreground' as const },
        { x: 200, y: 200, label: 'background' as const },
      ];

      const result = await analyzer.interactiveSegment(image, points);

      expect(result).toBeDefined();
      expect(result.follicleMasks.length).toBeGreaterThan(0);
    });
  });

  describe('configuration', () => {
    it('should return current config', () => {
      const config = analyzer.getConfig();

      expect(config).toBeDefined();
      expect(config.featureExtractor).toBeDefined();
      expect(config.segmentation).toBeDefined();
    });

    it('should update config', () => {
      analyzer.updateConfig({
        similaritySearch: {
          ...DEFAULT_VISION_CONFIG.similaritySearch,
          enabled: false,
        },
      });

      const config = analyzer.getConfig();
      expect(config.similaritySearch.enabled).toBe(false);
    });
  });

  describe('dispose()', () => {
    it('should cleanup resources', async () => {
      const featureExtractor = createMockFeatureExtractor();
      const segmentationModel = createMockSegmentationModel();

      const an = new TrichoscopyAnalyzer();
      await an.initialize({
        featureExtractor,
        segmentationModel,
        morphometryHead: createMockMorphometryHead(),
        densityHead: createMockDensityHead(),
        cycleHead: createMockCycleHead(),
      });

      await an.dispose();

      expect(featureExtractor.unload).toHaveBeenCalled();
      expect(segmentationModel.unload).toHaveBeenCalled();
      expect(an.isReady()).toBe(false);
    });
  });

  describe('ID generation', () => {
    it('should generate unique analysis IDs', async () => {
      const result1 = await analyzer.analyze(createMockImage());
      const result2 = await analyzer.analyze(createMockImage());

      expect(result1.analysisId).not.toBe(result2.analysisId);
    });

    it('should generate deterministic image IDs for same input', async () => {
      const image = createMockImage();
      const result1 = await analyzer.analyze(image);
      const result2 = await analyzer.analyze(image);

      expect(result1.imageId).toBe(result2.imageId);
    });
  });
});

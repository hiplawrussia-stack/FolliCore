/**
 * Tests for VisionTypes
 */

import {
  DEFAULT_VISION_CONFIG,
  VisionError,
  VisionErrorCode,
  ScalpZone,
  IVisionConfig,
  ITrichoscopyImage,
  IImageEmbedding,
  IMorphometryResult,
  IDensityResult,
  ICycleAnalysis,
  ISegmentationResult,
} from './VisionTypes';

describe('VisionTypes', () => {
  describe('ScalpZone type', () => {
    it('should accept valid zone values', () => {
      const zones: ScalpZone[] = ['temporal', 'parietal', 'occipital', 'frontal'];
      expect(zones).toHaveLength(4);
      zones.forEach(zone => {
        expect(['temporal', 'parietal', 'occipital', 'frontal']).toContain(zone);
      });
    });
  });

  describe('DEFAULT_VISION_CONFIG', () => {
    it('should have DINOv2-large as default feature extractor', () => {
      expect(DEFAULT_VISION_CONFIG.featureExtractor.model).toBe('dinov2-large');
    });

    it('should have CUDA as default device', () => {
      expect(DEFAULT_VISION_CONFIG.featureExtractor.device).toBe('cuda');
    });

    it('should have FP16 precision for performance', () => {
      expect(DEFAULT_VISION_CONFIG.featureExtractor.precision).toBe('fp16');
    });

    it('should have MedSAM as default segmentation model', () => {
      expect(DEFAULT_VISION_CONFIG.segmentation.model).toBe('medsam');
    });

    it('should have automatic prompt mode by default', () => {
      expect(DEFAULT_VISION_CONFIG.segmentation.promptMode).toBe('automatic');
    });

    it('should have reasonable morphometry thresholds', () => {
      expect(DEFAULT_VISION_CONFIG.morphometry.minSampleSize).toBe(10);
      expect(DEFAULT_VISION_CONFIG.morphometry.confidenceThreshold).toBe(0.7);
    });

    it('should have calibration settings', () => {
      expect(DEFAULT_VISION_CONFIG.morphometry.calibration.pixelsPerMicrometer).toBeGreaterThan(0);
    });

    it('should enable similarity search by default', () => {
      expect(DEFAULT_VISION_CONFIG.similaritySearch.enabled).toBe(true);
      expect(DEFAULT_VISION_CONFIG.similaritySearch.topK).toBe(5);
      expect(DEFAULT_VISION_CONFIG.similaritySearch.minSimilarity).toBe(0.7);
    });

    it('should enable explainability with ViT-CX', () => {
      expect(DEFAULT_VISION_CONFIG.explainability.enabled).toBe(true);
      expect(DEFAULT_VISION_CONFIG.explainability.method).toBe('vit-cx');
    });

    it('should have performance settings', () => {
      expect(DEFAULT_VISION_CONFIG.performance.batchSize).toBe(1);
      expect(DEFAULT_VISION_CONFIG.performance.maxConcurrency).toBe(4);
      expect(DEFAULT_VISION_CONFIG.performance.cacheEmbeddings).toBe(true);
    });
  });

  describe('VisionError', () => {
    it('should create error with code and message', () => {
      const error = new VisionError(
        VisionErrorCode.IMAGE_LOAD_FAILED,
        'Failed to load image'
      );
      expect(error.code).toBe(VisionErrorCode.IMAGE_LOAD_FAILED);
      expect(error.message).toBe('Failed to load image');
      expect(error.name).toBe('VisionError');
    });

    it('should support optional details', () => {
      const error = new VisionError(
        VisionErrorCode.INFERENCE_FAILED,
        'Model error',
        { modelId: 'test', errorCode: 500 }
      );
      expect(error.details).toEqual({ modelId: 'test', errorCode: 500 });
    });

    it('should have all error codes', () => {
      const codes = Object.values(VisionErrorCode);
      expect(codes).toContain('IMAGE_LOAD_FAILED');
      expect(codes).toContain('INVALID_IMAGE_FORMAT');
      expect(codes).toContain('MODEL_NOT_LOADED');
      expect(codes).toContain('INFERENCE_FAILED');
      expect(codes).toContain('CALIBRATION_MISSING');
      expect(codes).toContain('LOW_CONFIDENCE');
      expect(codes).toContain('SEGMENTATION_FAILED');
      expect(codes).toContain('VECTOR_DB_ERROR');
    });
  });

  describe('Interface structure validation', () => {
    it('should create valid ITrichoscopyImage', () => {
      const image: ITrichoscopyImage = {
        data: 'base64data',
        format: 'png',
        width: 1024,
        height: 768,
        magnification: 50,
        zone: 'temporal',
        capturedAt: new Date(),
      };
      expect(image.data).toBeDefined();
      expect(image.format).toBe('png');
      expect(image.zone).toBe('temporal');
    });

    it('should create valid IImageEmbedding', () => {
      const embedding: IImageEmbedding = {
        vector: new Float32Array(1024),
        dimension: 1024,
        modelVersion: 'dinov2-large',
        extractedAt: new Date(),
      };
      expect(embedding.vector.length).toBe(1024);
      expect(embedding.dimension).toBe(1024);
    });

    it('should create valid IMorphometryResult', () => {
      const result: IMorphometryResult = {
        bulbWidth: 72.5,
        shaftThickness: 32.1,
        bulbWidthStd: 2.3,
        shaftThicknessStd: 1.8,
        sampleSize: 25,
        confidence: 0.85,
      };
      expect(result.bulbWidth).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should create valid IDensityResult', () => {
      const result: IDensityResult = {
        totalHairCount: 150,
        density: 180,
        follicularUnits: 75,
        fuDistribution: {
          single: 20,
          double: 35,
          triple: 15,
          quad: 5,
        },
        analyzedArea: 0.5,
        confidence: 0.9,
      };
      expect(result.density).toBeGreaterThan(0);
      const fuSum = result.fuDistribution.single +
        result.fuDistribution.double +
        result.fuDistribution.triple +
        result.fuDistribution.quad;
      expect(fuSum).toBe(75);
    });

    it('should create valid ICycleAnalysis', () => {
      const analysis: ICycleAnalysis = {
        anagenCount: 85,
        catagenCount: 2,
        telogenCount: 13,
        anagenTelogenRatio: 0.87,
        vellusCount: 15,
        terminalCount: 85,
        vellusTerminalRatio: 0.18,
        confidence: 0.82,
      };
      expect(analysis.anagenCount + analysis.catagenCount + analysis.telogenCount).toBe(100);
      expect(analysis.anagenTelogenRatio).toBeGreaterThan(0);
      expect(analysis.vellusTerminalRatio).toBeLessThan(1);
    });

    it('should create valid ISegmentationResult', () => {
      const result: ISegmentationResult = {
        follicleMasks: ['mask1', 'mask2'],
        scalpMask: 'scalpMask',
        shaftMasks: ['shaft1', 'shaft2', 'shaft3'],
        roiBounds: { x: 100, y: 100, width: 800, height: 600 },
        confidence: 0.88,
      };
      expect(result.follicleMasks.length).toBeGreaterThan(0);
      expect(result.roiBounds.width).toBeGreaterThan(0);
    });
  });

  describe('Config merging', () => {
    it('should allow partial config override', () => {
      const customConfig: Partial<IVisionConfig> = {
        featureExtractor: {
          ...DEFAULT_VISION_CONFIG.featureExtractor,
          model: 'dinov2-base',
          device: 'cpu',
        },
      };

      const merged = { ...DEFAULT_VISION_CONFIG, ...customConfig };
      expect(merged.featureExtractor.model).toBe('dinov2-base');
      expect(merged.featureExtractor.device).toBe('cpu');
      // Other defaults preserved
      expect(merged.segmentation.model).toBe('medsam');
    });
  });
});

/**
 * GrpcFeatureExtractor Tests
 *
 * Tests the critical TypeScript↔Python ML API bridge.
 *
 * IEC 62304 Note:
 *   These tests verify the feature extraction pipeline.
 *   Uses mock implementations to test without ML API dependency.
 */

import {
  GrpcFeatureExtractor,
  createMockFeatureExtractor,
  type IFeatureExtractor,
} from '../GrpcFeatureExtractor';

import type { ITrichoscopyImage } from '../../vision/VisionTypes';

describe('GrpcFeatureExtractor', () => {
  describe('createMockFeatureExtractor', () => {
    let extractor: IFeatureExtractor;

    beforeEach(() => {
      // Suppress console.warn for mock creation
      jest.spyOn(console, 'warn').mockImplementation(() => {});
      extractor = createMockFeatureExtractor();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should create a mock extractor', () => {
      expect(extractor).toBeDefined();
      expect(extractor.isLoaded()).toBe(false);
    });

    it('should load and unload', async () => {
      expect(extractor.isLoaded()).toBe(false);

      await extractor.load();
      expect(extractor.isLoaded()).toBe(true);

      await extractor.unload();
      expect(extractor.isLoaded()).toBe(false);
    });

    it('should throw if extracting before load', async () => {
      const image: ITrichoscopyImage = {
        data: Buffer.from('test'),
        format: 'png',
        width: 224,
        height: 224,
        magnification: 50,
        zone: 'vertex',
        capturedAt: new Date(),
      };

      await expect(extractor.extract(image)).rejects.toThrow('not loaded');
    });

    it('should extract features after load', async () => {
      await extractor.load();

      const image: ITrichoscopyImage = {
        data: Buffer.from('test image data'),
        format: 'png',
        width: 224,
        height: 224,
        magnification: 50,
        zone: 'vertex',
        capturedAt: new Date(),
      };

      const embedding = await extractor.extract(image);

      expect(embedding).toBeDefined();
      expect(embedding.vector).toBeInstanceOf(Float32Array);
      expect(embedding.dimension).toBe(768); // DINOv2 base
      expect(embedding.modelVersion).toBe('mock-v1.0.0');
      expect(embedding.extractedAt).toBeInstanceOf(Date);
    });

    it('should produce deterministic embeddings for same input', async () => {
      await extractor.load();

      const image: ITrichoscopyImage = {
        data: Buffer.from('test'),
        format: 'png',
        width: 224,
        height: 224,
        magnification: 50,
        zone: 'frontal',
        capturedAt: new Date(),
      };

      const embedding1 = await extractor.extract(image);
      const embedding2 = await extractor.extract(image);

      // Should be deterministic based on image dimensions
      expect(embedding1.vector).toEqual(embedding2.vector);
    });

    it('should produce different embeddings for different inputs', async () => {
      await extractor.load();

      const image1: ITrichoscopyImage = {
        data: Buffer.from('test1'),
        format: 'png',
        width: 224,
        height: 224,
        magnification: 50,
        zone: 'vertex',
        capturedAt: new Date(),
      };

      const image2: ITrichoscopyImage = {
        data: Buffer.from('test2'),
        format: 'png',
        width: 448,
        height: 448,
        magnification: 100,
        zone: 'occipital',
        capturedAt: new Date(),
      };

      const embedding1 = await extractor.extract(image1);
      const embedding2 = await extractor.extract(image2);

      // Different dimensions/magnification should produce different embeddings
      expect(embedding1.vector).not.toEqual(embedding2.vector);
    });
  });

  describe('GrpcFeatureExtractor (unit tests)', () => {
    it('should instantiate with default config', () => {
      const extractor = new GrpcFeatureExtractor();
      expect(extractor).toBeDefined();
      expect(extractor.isLoaded()).toBe(false);
    });

    it('should instantiate with custom config', () => {
      const extractor = new GrpcFeatureExtractor({
        grpcConfig: {
          host: 'custom-host',
          port: 50052,
        },
        returnAttentionMaps: true,
        minConfidence: 0.8,
      });

      expect(extractor).toBeDefined();
      expect(extractor.isLoaded()).toBe(false);
    });

    it('should report not loaded before connect', () => {
      const extractor = new GrpcFeatureExtractor();
      expect(extractor.isLoaded()).toBe(false);
      expect(extractor.getModelVersion()).toBe('unknown');
    });

    it('should throw on extract before load', async () => {
      const extractor = new GrpcFeatureExtractor();

      const image: ITrichoscopyImage = {
        data: Buffer.from('test'),
        format: 'png',
        width: 224,
        height: 224,
        magnification: 50,
        zone: 'vertex',
        capturedAt: new Date(),
      };

      await expect(extractor.extract(image)).rejects.toThrow('not loaded');
    });
  });
});

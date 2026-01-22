/**
 * Tests for AcousticTypes
 */

import {
  // Sensor types
  type AcousticSensorType,
  type ISensorChannel,
  DEFAULT_SENSOR_ARRAY,

  // Audio signal types
  type IAudioSignal,
  type IAcousticEnvironment,

  // Spectral types
  type IMelSpectrogram,
  type ISpectralFeatures,

  // Embedding types
  type IAudioEmbedding,
  type IAcousticTokens,
  type AcousticModelType,

  // Hair analysis types
  type HairStructureClass,
  type PorosityLevel,
  type HydrationLevel,
  type IPorosityAnalysis,
  type IHydrationAnalysis,
  type IStructuralAnalysis,
  type DamageType,

  // Complete analysis
  type IAcousticAnalysisResult,
  type IAcousticQualityFlags,
  toAcousticObservation,

  // Configuration
  type IAcousticConfig,
  DEFAULT_ACOUSTIC_CONFIG,
  EDGE_ACOUSTIC_CONFIG,

  // Protocol
  type MeasurementPhase,
  DEFAULT_MEASUREMENT_PROTOCOL,
  type IMeasurementSession,

  // Reference data
  type IAcousticReference,
  ACOUSTIC_NORMS,

  // Error types
  AcousticErrorCode,
  AcousticError,

  // Backend interfaces
  type IFeatureExtractorBackend,
  type IHairAnalysisBackend,
  type ISpectralAnalysisBackend,
} from './AcousticTypes';

describe('AcousticTypes', () => {
  // =========================================================================
  // SENSOR TYPES
  // =========================================================================

  describe('Sensor Types', () => {
    describe('AcousticSensorType', () => {
      it('should define all supported sensor types', () => {
        const validTypes: AcousticSensorType[] = [
          'scaln_mems',
          'piezo_contact',
          'capacitive_mems',
          'reference',
        ];
        expect(validTypes).toHaveLength(4);
      });
    });

    describe('DEFAULT_SENSOR_ARRAY', () => {
      it('should have three channels configured', () => {
        expect(DEFAULT_SENSOR_ARRAY.channels).toHaveLength(3);
      });

      it('should have ScAlN MEMS as primary channel', () => {
        const primary = DEFAULT_SENSOR_ARRAY.channels.find(c => c.channelId === 'primary');
        expect(primary).toBeDefined();
        expect(primary.sensorType).toBe('scaln_mems');
        expect(primary.frequencyRange[0]).toBe(200000);
        expect(primary.frequencyRange[1]).toBe(2000000);
      });

      it('should have piezo contact as secondary channel', () => {
        const contact = DEFAULT_SENSOR_ARRAY.channels.find(c => c.channelId === 'contact');
        expect(contact).toBeDefined();
        expect(contact.sensorType).toBe('piezo_contact');
        expect(contact.frequencyRange[0]).toBe(20);
        expect(contact.frequencyRange[1]).toBe(100000);
      });

      it('should have reference channel for ambient noise', () => {
        const ambient = DEFAULT_SENSOR_ARRAY.channels.find(c => c.channelId === 'ambient');
        expect(ambient).toBeDefined();
        expect(ambient.sensorType).toBe('reference');
      });

      it('should use 24-bit ADC for high-quality audio', () => {
        const highQualityChannels = DEFAULT_SENSOR_ARRAY.channels.filter(
          c => c.bitDepth === 24
        );
        expect(highQualityChannels.length).toBeGreaterThanOrEqual(2);
      });

      it('should have ESP32-S3 as MCU', () => {
        expect(DEFAULT_SENSOR_ARRAY.mcuId).toBe('ESP32-S3');
      });

      it('should have valid calibration date', () => {
        expect(DEFAULT_SENSOR_ARRAY.calibratedAt).toBeInstanceOf(Date);
      });
    });

    describe('ISensorChannel interface', () => {
      it('should create valid sensor channel', () => {
        const channel: ISensorChannel = {
          channelId: 'test-channel',
          sensorType: 'piezo_contact',
          sampleRate: 96000,
          bitDepth: 24,
          frequencyRange: [20, 50000],
          sensitivity: -40,
          active: true,
        };
        expect(channel.channelId).toBe('test-channel');
        expect(channel.sampleRate).toBe(96000);
        expect(channel.frequencyRange[1]).toBeGreaterThan(channel.frequencyRange[0]);
      });
    });
  });

  // =========================================================================
  // AUDIO SIGNAL TYPES
  // =========================================================================

  describe('Audio Signal Types', () => {
    describe('IAudioSignal', () => {
      it('should create valid audio signal', () => {
        const signal: IAudioSignal = {
          data: new Float32Array(48000), // 1 second at 48kHz
          sampleRate: 48000,
          channels: 1,
          duration: 1.0,
          capturedAt: new Date(),
          sourceChannel: 'primary',
        };
        expect(signal.data.length).toBe(48000);
        expect(signal.duration).toBe(1.0);
      });

      it('should have normalized data range', () => {
        const signal: IAudioSignal = {
          data: new Float32Array([0.5, -0.5, 0.8, -0.8]),
          sampleRate: 48000,
          channels: 1,
          duration: 0.001,
          capturedAt: new Date(),
          sourceChannel: 'test',
        };
        signal.data.forEach(sample => {
          expect(sample).toBeGreaterThanOrEqual(-1);
          expect(sample).toBeLessThanOrEqual(1);
        });
      });
    });

    describe('IAcousticEnvironment', () => {
      it('should create valid environment data', () => {
        const env: IAcousticEnvironment = {
          ambientNoiseDb: 45,
          temperature: 22.5,
          humidity: 55,
          contactPressure: 0.5,
          qualityScore: 0.85,
        };
        expect(env.ambientNoiseDb).toBeLessThan(100);
        expect(env.qualityScore).toBeLessThanOrEqual(1);
      });
    });
  });

  // =========================================================================
  // SPECTRAL ANALYSIS TYPES
  // =========================================================================

  describe('Spectral Analysis Types', () => {
    describe('IMelSpectrogram', () => {
      it('should create valid mel spectrogram', () => {
        const melSpec: IMelSpectrogram = {
          data: [new Float32Array(128), new Float32Array(128)],
          timeFrames: 2,
          melBins: 128,
          hopSize: 512,
          windowSize: 2048,
          fMin: 20,
          fMax: 96000,
        };
        expect(melSpec.data.length).toBe(melSpec.timeFrames);
        expect(melSpec.data[0].length).toBe(melSpec.melBins);
      });
    });

    describe('ISpectralFeatures', () => {
      it('should create valid spectral features', () => {
        const features: ISpectralFeatures = {
          centroid: 5000,
          bandwidth: 2000,
          rolloff: 8000,
          flatness: 0.3,
          contrast: [0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
          zeroCrossingRate: 0.15,
          rmsEnergy: 0.05,
          mfcc: new Array(13).fill(0).map(() => Math.random() * 10 - 5),
        };
        expect(features.centroid).toBeGreaterThan(0);
        expect(features.flatness).toBeGreaterThanOrEqual(0);
        expect(features.flatness).toBeLessThanOrEqual(1);
        expect(features.mfcc.length).toBe(13);
      });
    });
  });

  // =========================================================================
  // ML EMBEDDING TYPES
  // =========================================================================

  describe('ML Embedding Types', () => {
    describe('AcousticModelType', () => {
      it('should define all supported model types', () => {
        const validModels: AcousticModelType[] = [
          'openbeats-base',
          'openbeats-large',
          'beats-iter3',
          'mamba-audio',
          'ast-base',
          'wav2vec2-conformer',
          'whisper-encoder',
        ];
        expect(validModels).toHaveLength(7);
      });
    });

    describe('IAudioEmbedding', () => {
      it('should create valid audio embedding', () => {
        const embedding: IAudioEmbedding = {
          vector: new Float32Array(768),
          dimension: 768,
          model: 'openbeats-base',
          modelVersion: '1.0.0',
          extractedAt: new Date(),
          layer: 12,
        };
        expect(embedding.vector.length).toBe(768);
        expect(embedding.dimension).toBe(768);
      });
    });

    describe('IAcousticTokens', () => {
      it('should create valid acoustic tokens', () => {
        const tokens: IAcousticTokens = {
          tokenIds: [100, 200, 300, 400, 500],
          tokenEmbeddings: [
            new Float32Array(256),
            new Float32Array(256),
            new Float32Array(256),
            new Float32Array(256),
            new Float32Array(256),
          ],
          numTokens: 5,
          codebookSize: 8192,
        };
        expect(tokens.tokenIds.length).toBe(tokens.numTokens);
        expect(tokens.tokenEmbeddings.length).toBe(tokens.numTokens);
      });
    });
  });

  // =========================================================================
  // HAIR STRUCTURE ANALYSIS TYPES
  // =========================================================================

  describe('Hair Structure Analysis Types', () => {
    describe('Classification types', () => {
      it('should define HairStructureClass values', () => {
        const classes: HairStructureClass[] = [
          'healthy',
          'weathered',
          'chemically_damaged',
          'mechanically_damaged',
          'severely_damaged',
        ];
        expect(classes).toHaveLength(5);
      });

      it('should define PorosityLevel values', () => {
        const levels: PorosityLevel[] = ['low', 'normal', 'high', 'variable'];
        expect(levels).toHaveLength(4);
      });

      it('should define HydrationLevel values', () => {
        const levels: HydrationLevel[] = ['dehydrated', 'low', 'optimal', 'high'];
        expect(levels).toHaveLength(4);
      });

      it('should define DamageType values', () => {
        const types: DamageType[] = [
          'cuticle_lifting',
          'cortex_exposure',
          'split_ends',
          'breakage_prone',
          'heat_damage',
          'chemical_damage',
          'mechanical_wear',
        ];
        expect(types).toHaveLength(7);
      });
    });

    describe('IPorosityAnalysis', () => {
      it('should create valid porosity analysis', () => {
        const analysis: IPorosityAnalysis = {
          score: 0.25,
          level: 'normal',
          absorptionCoefficient: 0.18,
          cuticleIntegrity: 0.85,
          confidence: 0.9,
        };
        expect(analysis.score).toBeGreaterThanOrEqual(0);
        expect(analysis.score).toBeLessThanOrEqual(1);
        expect(analysis.confidence).toBeLessThanOrEqual(1);
      });

      it('should have lower score for healthier hair', () => {
        const healthy: IPorosityAnalysis = {
          score: 0.15,
          level: 'low',
          absorptionCoefficient: 0.12,
          cuticleIntegrity: 0.95,
          confidence: 0.88,
        };
        const damaged: IPorosityAnalysis = {
          score: 0.75,
          level: 'high',
          absorptionCoefficient: 0.6,
          cuticleIntegrity: 0.3,
          confidence: 0.85,
        };
        expect(healthy.score).toBeLessThan(damaged.score);
        expect(healthy.cuticleIntegrity).toBeGreaterThan(damaged.cuticleIntegrity);
      });
    });

    describe('IHydrationAnalysis', () => {
      it('should create valid hydration analysis', () => {
        const analysis: IHydrationAnalysis = {
          score: 0.75,
          level: 'optimal',
          moisturePercent: 12.5,
          waveVelocity: 1500,
          confidence: 0.87,
        };
        expect(analysis.moisturePercent).toBeGreaterThan(0);
        expect(analysis.moisturePercent).toBeLessThan(100);
      });

      it('should have higher score for healthier hydration', () => {
        const hydrated: IHydrationAnalysis = {
          score: 0.8,
          level: 'optimal',
          moisturePercent: 13,
          waveVelocity: 1400,
          confidence: 0.9,
        };
        const dehydrated: IHydrationAnalysis = {
          score: 0.2,
          level: 'dehydrated',
          moisturePercent: 5,
          waveVelocity: 1800,
          confidence: 0.85,
        };
        expect(hydrated.score).toBeGreaterThan(dehydrated.score);
      });
    });

    describe('IStructuralAnalysis', () => {
      it('should create valid structural analysis', () => {
        const analysis: IStructuralAnalysis = {
          structureClass: 'healthy',
          damageScore: 0.1,
          scatteringRegularity: 0.9,
          dampingCoefficient: 0.25,
          resonanceFrequency: 5000,
          damageTypes: [],
          confidence: 0.92,
        };
        expect(analysis.damageScore).toBeLessThan(0.5);
        expect(analysis.damageTypes).toHaveLength(0);
      });

      it('should detect multiple damage types', () => {
        const analysis: IStructuralAnalysis = {
          structureClass: 'severely_damaged',
          damageScore: 0.85,
          scatteringRegularity: 0.2,
          dampingCoefficient: 0.75,
          resonanceFrequency: 3500,
          damageTypes: ['cuticle_lifting', 'heat_damage', 'chemical_damage'],
          confidence: 0.8,
        };
        expect(analysis.damageTypes.length).toBeGreaterThan(0);
        expect(analysis.damageScore).toBeGreaterThan(0.5);
      });
    });
  });

  // =========================================================================
  // COMPLETE ANALYSIS TYPES
  // =========================================================================

  describe('Complete Analysis Types', () => {
    describe('IAcousticQualityFlags', () => {
      it('should create valid quality flags', () => {
        const flags: IAcousticQualityFlags = {
          snrAcceptable: true,
          contactQualityGood: true,
          motionArtifactsDetected: false,
          ambientNoiseAcceptable: true,
          overallQuality: 0.9,
          warnings: [],
        };
        expect(flags.overallQuality).toBeGreaterThan(0.5);
        expect(flags.warnings).toHaveLength(0);
      });

      it('should track quality issues', () => {
        const flags: IAcousticQualityFlags = {
          snrAcceptable: false,
          contactQualityGood: false,
          motionArtifactsDetected: true,
          ambientNoiseAcceptable: true,
          overallQuality: 0.35,
          warnings: ['Low SNR detected', 'Poor sensor contact', 'Motion artifacts present'],
        };
        expect(flags.overallQuality).toBeLessThan(0.5);
        expect(flags.warnings.length).toBe(3);
      });
    });

    describe('toAcousticObservation', () => {
      const createMockAnalysis = (
        structureClass: HairStructureClass,
        porosity: number,
        hydration: number
      ): IAcousticAnalysisResult => ({
        analysisId: 'test-123',
        recordingId: 'rec-123',
        zone: 'temporal',
        analyzedAt: new Date(),
        embedding: {
          vector: new Float32Array(768),
          dimension: 768,
          model: 'openbeats-base',
          modelVersion: '1.0.0',
          extractedAt: new Date(),
          layer: 12,
        },
        porosity: {
          score: porosity,
          level: 'normal',
          absorptionCoefficient: 0.2,
          cuticleIntegrity: 0.8,
          confidence: 0.9,
        },
        hydration: {
          score: hydration,
          level: 'optimal',
          moisturePercent: 12,
          waveVelocity: 1500,
          confidence: 0.88,
        },
        structure: {
          structureClass,
          damageScore: 0.2,
          scatteringRegularity: 0.8,
          dampingCoefficient: 0.3,
          resonanceFrequency: 5000,
          damageTypes: [],
          confidence: 0.85,
        },
        spectralAnalysis: {
          melSpectrogram: {
            data: [],
            timeFrames: 0,
            melBins: 128,
            hopSize: 512,
            windowSize: 2048,
            fMin: 20,
            fMax: 96000,
          },
          spectralFeatures: [],
          globalFeatures: {
            centroid: 5000,
            bandwidth: 2000,
            rolloff: 8000,
            flatness: 0.3,
            contrast: [],
            zeroCrossingRate: 0.1,
            rmsEnergy: 0.05,
            mfcc: [],
          },
          analyzedAt: new Date(),
        },
        overallConfidence: 0.87,
        processingTimeMs: 150,
        modelVersions: {
          featureExtractor: 'openbeats-base-1.0',
          porosityHead: 'porosity-v1',
          hydrationHead: 'hydration-v1',
          structureHead: 'structure-v1',
        },
        qualityFlags: {
          snrAcceptable: true,
          contactQualityGood: true,
          motionArtifactsDetected: false,
          ambientNoiseAcceptable: true,
          overallQuality: 0.9,
          warnings: [],
        },
      });

      it('should convert healthy analysis to observation', () => {
        const analysis = createMockAnalysis('healthy', 0.2, 0.8);
        const observation = toAcousticObservation(analysis);

        expect(observation.porosity).toBe(0.2);
        expect(observation.hydration).toBe(0.8);
        expect(observation.structureClass).toBe('healthy');
        expect(observation.confidence).toBe(0.87);
      });

      it('should map weathered structure class correctly', () => {
        const analysis = createMockAnalysis('weathered', 0.4, 0.6);
        const observation = toAcousticObservation(analysis);

        expect(observation.structureClass).toBe('weathered');
      });

      it('should map damaged structure classes to damaged', () => {
        const classes: HairStructureClass[] = [
          'chemically_damaged',
          'mechanically_damaged',
          'severely_damaged',
        ];

        classes.forEach(structureClass => {
          const analysis = createMockAnalysis(structureClass, 0.7, 0.3);
          const observation = toAcousticObservation(analysis);
          expect(observation.structureClass).toBe('damaged');
        });
      });

      it('should preserve confidence from overall analysis', () => {
        const analysis = createMockAnalysis('healthy', 0.15, 0.85);
        analysis.overallConfidence = 0.95;
        const observation = toAcousticObservation(analysis);

        expect(observation.confidence).toBe(0.95);
      });
    });
  });

  // =========================================================================
  // CONFIGURATION TYPES
  // =========================================================================

  describe('Configuration Types', () => {
    describe('DEFAULT_ACOUSTIC_CONFIG', () => {
      it('should use OpenBEATs as default model', () => {
        expect(DEFAULT_ACOUSTIC_CONFIG.featureExtractor.model).toBe('openbeats-base');
      });

      it('should use CUDA as default device', () => {
        expect(DEFAULT_ACOUSTIC_CONFIG.featureExtractor.device).toBe('cuda');
      });

      it('should use FP16 precision for performance', () => {
        expect(DEFAULT_ACOUSTIC_CONFIG.featureExtractor.precision).toBe('fp16');
      });

      it('should have reasonable spectral settings', () => {
        expect(DEFAULT_ACOUSTIC_CONFIG.spectral.nFft).toBe(2048);
        expect(DEFAULT_ACOUSTIC_CONFIG.spectral.nMels).toBe(128);
        expect(DEFAULT_ACOUSTIC_CONFIG.spectral.fMax).toBe(96000);
      });

      it('should have quality thresholds', () => {
        expect(DEFAULT_ACOUSTIC_CONFIG.thresholds.minConfidence).toBe(0.6);
        expect(DEFAULT_ACOUSTIC_CONFIG.thresholds.minSnrDb).toBe(20);
        expect(DEFAULT_ACOUSTIC_CONFIG.thresholds.maxAmbientNoiseDb).toBe(60);
      });

      it('should have edge deployment disabled by default', () => {
        expect(DEFAULT_ACOUSTIC_CONFIG.edge.enabled).toBe(false);
      });

      it('should enable similarity search by default', () => {
        expect(DEFAULT_ACOUSTIC_CONFIG.similaritySearch.enabled).toBe(true);
        expect(DEFAULT_ACOUSTIC_CONFIG.similaritySearch.topK).toBe(5);
      });
    });

    describe('EDGE_ACOUSTIC_CONFIG', () => {
      it('should use Mamba for edge deployment', () => {
        expect(EDGE_ACOUSTIC_CONFIG.featureExtractor.model).toBe('mamba-audio');
      });

      it('should use edge device', () => {
        expect(EDGE_ACOUSTIC_CONFIG.featureExtractor.device).toBe('edge');
      });

      it('should use INT8 quantization', () => {
        expect(EDGE_ACOUSTIC_CONFIG.featureExtractor.precision).toBe('int8');
      });

      it('should have edge deployment enabled', () => {
        expect(EDGE_ACOUSTIC_CONFIG.edge.enabled).toBe(true);
        expect(EDGE_ACOUSTIC_CONFIG.edge.quantized).toBe(true);
        expect(EDGE_ACOUSTIC_CONFIG.edge.maxLatencyMs).toBe(50);
      });

      it('should disable similarity search for edge', () => {
        expect(EDGE_ACOUSTIC_CONFIG.similaritySearch.enabled).toBe(false);
      });

      it('should have reduced spectral settings for efficiency', () => {
        expect(EDGE_ACOUSTIC_CONFIG.spectral.nFft).toBe(1024);
        expect(EDGE_ACOUSTIC_CONFIG.spectral.nMels).toBe(64);
        expect(EDGE_ACOUSTIC_CONFIG.spectral.fMax).toBe(48000);
      });

      it('should have relaxed thresholds for edge', () => {
        expect(EDGE_ACOUSTIC_CONFIG.thresholds.minConfidence).toBeLessThan(
          DEFAULT_ACOUSTIC_CONFIG.thresholds.minConfidence
        );
      });
    });

    describe('Config merging', () => {
      it('should allow partial config override', () => {
        const customConfig: Partial<IAcousticConfig> = {
          featureExtractor: {
            ...DEFAULT_ACOUSTIC_CONFIG.featureExtractor,
            model: 'beats-iter3',
            device: 'cpu',
          },
        };

        const merged = { ...DEFAULT_ACOUSTIC_CONFIG, ...customConfig };
        expect(merged.featureExtractor.model).toBe('beats-iter3');
        expect(merged.featureExtractor.device).toBe('cpu');
        // Other defaults preserved
        expect(merged.spectral.nMels).toBe(128);
      });
    });
  });

  // =========================================================================
  // MEASUREMENT PROTOCOL TYPES
  // =========================================================================

  describe('Measurement Protocol Types', () => {
    describe('MeasurementPhase', () => {
      it('should define all measurement phases', () => {
        const phases: MeasurementPhase[] = [
          'calibration',
          'contact_check',
          'pulse_emission',
          'passive_recording',
          'analysis',
        ];
        expect(phases).toHaveLength(5);
      });
    });

    describe('DEFAULT_MEASUREMENT_PROTOCOL', () => {
      it('should have standard protocol name', () => {
        expect(DEFAULT_MEASUREMENT_PROTOCOL.name).toBe('follicore-standard');
      });

      it('should have reasonable phase durations', () => {
        expect(DEFAULT_MEASUREMENT_PROTOCOL.phaseDurations.calibration).toBe(5);
        expect(DEFAULT_MEASUREMENT_PROTOCOL.phaseDurations.contact_check).toBe(2);
        expect(DEFAULT_MEASUREMENT_PROTOCOL.phaseDurations.pulse_emission).toBe(2);
        expect(DEFAULT_MEASUREMENT_PROTOCOL.phaseDurations.passive_recording).toBe(3);
      });

      it('should have chirp configuration', () => {
        expect(DEFAULT_MEASUREMENT_PROTOCOL.chirpConfig.startFrequency).toBe(1000);
        expect(DEFAULT_MEASUREMENT_PROTOCOL.chirpConfig.endFrequency).toBe(100000);
        expect(DEFAULT_MEASUREMENT_PROTOCOL.chirpConfig.duration).toBe(0.5);
      });

      it('should have contact impedance range', () => {
        expect(DEFAULT_MEASUREMENT_PROTOCOL.minContactImpedance).toBeLessThan(
          DEFAULT_MEASUREMENT_PROTOCOL.maxContactImpedance
        );
      });
    });

    describe('IMeasurementSession', () => {
      it('should create valid measurement session', () => {
        const session: IMeasurementSession = {
          sessionId: 'session-123',
          patientId: 'patient-456',
          currentPhase: 'calibration',
          phaseStartedAt: new Date(),
          protocol: DEFAULT_MEASUREMENT_PROTOCOL,
          recordings: [],
          status: 'in_progress',
        };
        expect(session.status).toBe('in_progress');
        expect(session.recordings).toHaveLength(0);
      });

      it('should track failed session with error', () => {
        const session: IMeasurementSession = {
          sessionId: 'session-123',
          patientId: 'patient-456',
          currentPhase: 'contact_check',
          phaseStartedAt: new Date(),
          protocol: DEFAULT_MEASUREMENT_PROTOCOL,
          recordings: [],
          status: 'failed',
          error: 'Poor sensor contact detected',
        };
        expect(session.status).toBe('failed');
        expect(session.error).toBeDefined();
      });
    });
  });

  // =========================================================================
  // REFERENCE DATA TYPES
  // =========================================================================

  describe('Reference Data Types', () => {
    describe('ACOUSTIC_NORMS', () => {
      it('should have norms for healthy hair', () => {
        expect(ACOUSTIC_NORMS.healthy).toBeDefined();
        expect(ACOUSTIC_NORMS.healthy.porosity.mean).toBeLessThan(0.5);
        expect(ACOUSTIC_NORMS.healthy.hydration.mean).toBeGreaterThan(0.5);
      });

      it('should have norms for weathered hair', () => {
        expect(ACOUSTIC_NORMS.weathered).toBeDefined();
        expect(ACOUSTIC_NORMS.weathered.porosity.mean).toBeGreaterThan(
          ACOUSTIC_NORMS.healthy.porosity.mean
        );
      });

      it('should have norms for damaged hair', () => {
        expect(ACOUSTIC_NORMS.damaged).toBeDefined();
        expect(ACOUSTIC_NORMS.damaged.porosity.mean).toBeGreaterThan(
          ACOUSTIC_NORMS.weathered.porosity.mean
        );
        expect(ACOUSTIC_NORMS.damaged.hydration.mean).toBeLessThan(
          ACOUSTIC_NORMS.healthy.hydration.mean
        );
      });

      it('should have mean and std for all metrics', () => {
        Object.values(ACOUSTIC_NORMS).forEach(norm => {
          expect(norm.porosity.mean).toBeDefined();
          expect(norm.porosity.std).toBeDefined();
          expect(norm.hydration.mean).toBeDefined();
          expect(norm.hydration.std).toBeDefined();
          expect(norm.absorptionCoefficient.mean).toBeDefined();
          expect(norm.absorptionCoefficient.std).toBeDefined();
          expect(norm.dampingCoefficient.mean).toBeDefined();
          expect(norm.dampingCoefficient.std).toBeDefined();
        });
      });
    });

    describe('IAcousticReference', () => {
      it('should create valid reference signature', () => {
        const reference: IAcousticReference = {
          referenceId: 'ref-healthy-001',
          condition: 'healthy',
          porosityLevel: 'low',
          hydrationLevel: 'optimal',
          embedding: new Float32Array(768),
          sampleSize: 500,
          createdAt: new Date(),
        };
        expect(reference.embedding.length).toBe(768);
        expect(reference.sampleSize).toBeGreaterThan(0);
      });
    });
  });

  // =========================================================================
  // ERROR TYPES
  // =========================================================================

  describe('Error Types', () => {
    describe('AcousticErrorCode', () => {
      it('should have recording error codes', () => {
        const codes = Object.values(AcousticErrorCode);
        expect(codes).toContain('RECORDING_FAILED');
        expect(codes).toContain('SENSOR_NOT_CONNECTED');
        expect(codes).toContain('POOR_CONTACT');
        expect(codes).toContain('LOW_SNR');
        expect(codes).toContain('EXCESSIVE_NOISE');
      });

      it('should have analysis error codes', () => {
        const codes = Object.values(AcousticErrorCode);
        expect(codes).toContain('MODEL_NOT_LOADED');
        expect(codes).toContain('INFERENCE_FAILED');
        expect(codes).toContain('LOW_CONFIDENCE');
        expect(codes).toContain('INVALID_SIGNAL');
      });

      it('should have calibration error codes', () => {
        const codes = Object.values(AcousticErrorCode);
        expect(codes).toContain('CALIBRATION_FAILED');
        expect(codes).toContain('CALIBRATION_EXPIRED');
      });

      it('should have edge deployment error codes', () => {
        const codes = Object.values(AcousticErrorCode);
        expect(codes).toContain('EDGE_MODEL_NOT_FOUND');
        expect(codes).toContain('EDGE_INFERENCE_TIMEOUT');
        expect(codes).toContain('EDGE_MEMORY_EXCEEDED');
      });

      it('should have protocol error codes', () => {
        const codes = Object.values(AcousticErrorCode);
        expect(codes).toContain('PROTOCOL_VIOLATED');
        expect(codes).toContain('SESSION_TIMEOUT');
      });
    });

    describe('AcousticError', () => {
      it('should create error with code and message', () => {
        const error = new AcousticError(
          AcousticErrorCode.RECORDING_FAILED,
          'Failed to start recording'
        );
        expect(error.code).toBe(AcousticErrorCode.RECORDING_FAILED);
        expect(error.message).toBe('Failed to start recording');
        expect(error.name).toBe('AcousticError');
      });

      it('should support optional details', () => {
        const error = new AcousticError(
          AcousticErrorCode.LOW_SNR,
          'Signal-to-noise ratio too low',
          { snrDb: 12, requiredSnrDb: 20 }
        );
        expect(error.details).toEqual({ snrDb: 12, requiredSnrDb: 20 });
      });

      it('should be instance of Error', () => {
        const error = new AcousticError(
          AcousticErrorCode.SENSOR_NOT_CONNECTED,
          'Sensor disconnected'
        );
        expect(error).toBeInstanceOf(Error);
      });
    });
  });

  // =========================================================================
  // BACKEND INTERFACES
  // =========================================================================

  describe('Backend Interfaces', () => {
    it('should define IFeatureExtractorBackend interface', () => {
      // Type check - if this compiles, the interface is properly defined
      const mockBackend: IFeatureExtractorBackend = {
        initialize: jest.fn().mockResolvedValue(undefined),
        extractEmbedding: jest.fn().mockResolvedValue({
          vector: new Float32Array(768),
          dimension: 768,
          model: 'openbeats-base',
          modelVersion: '1.0.0',
          extractedAt: new Date(),
          layer: 12,
        }),
        extractTokens: jest.fn().mockResolvedValue({
          tokenIds: [1, 2, 3],
          tokenEmbeddings: [new Float32Array(256)],
          numTokens: 3,
          codebookSize: 8192,
        }),
        getModelInfo: jest.fn().mockReturnValue({
          name: 'openbeats',
          version: '1.0.0',
          device: 'cuda',
        }),
        dispose: jest.fn().mockResolvedValue(undefined),
      };

      expect(mockBackend.initialize).toBeDefined();
      expect(mockBackend.extractEmbedding).toBeDefined();
      expect(mockBackend.extractTokens).toBeDefined();
      expect(mockBackend.getModelInfo).toBeDefined();
      expect(mockBackend.dispose).toBeDefined();
    });

    it('should define IHairAnalysisBackend interface', () => {
      const mockBackend: IHairAnalysisBackend = {
        initialize: jest.fn().mockResolvedValue(undefined),
        analyzePorosity: jest.fn().mockResolvedValue({
          score: 0.2,
          level: 'normal',
          absorptionCoefficient: 0.15,
          cuticleIntegrity: 0.85,
          confidence: 0.9,
        }),
        analyzeHydration: jest.fn().mockResolvedValue({
          score: 0.75,
          level: 'optimal',
          moisturePercent: 12,
          waveVelocity: 1500,
          confidence: 0.88,
        }),
        analyzeStructure: jest.fn().mockResolvedValue({
          structureClass: 'healthy',
          damageScore: 0.1,
          scatteringRegularity: 0.9,
          dampingCoefficient: 0.25,
          resonanceFrequency: 5000,
          damageTypes: [],
          confidence: 0.92,
        }),
        dispose: jest.fn().mockResolvedValue(undefined),
      };

      expect(mockBackend.initialize).toBeDefined();
      expect(mockBackend.analyzePorosity).toBeDefined();
      expect(mockBackend.analyzeHydration).toBeDefined();
      expect(mockBackend.analyzeStructure).toBeDefined();
      expect(mockBackend.dispose).toBeDefined();
    });

    it('should define ISpectralAnalysisBackend interface', () => {
      const mockBackend: ISpectralAnalysisBackend = {
        computeMelSpectrogram: jest.fn().mockResolvedValue({
          data: [],
          timeFrames: 100,
          melBins: 128,
          hopSize: 512,
          windowSize: 2048,
          fMin: 20,
          fMax: 96000,
        }),
        extractSpectralFeatures: jest.fn().mockResolvedValue([]),
        computeGlobalFeatures: jest.fn().mockReturnValue({
          centroid: 5000,
          bandwidth: 2000,
          rolloff: 8000,
          flatness: 0.3,
          contrast: [],
          zeroCrossingRate: 0.1,
          rmsEnergy: 0.05,
          mfcc: [],
        }),
      };

      expect(mockBackend.computeMelSpectrogram).toBeDefined();
      expect(mockBackend.extractSpectralFeatures).toBeDefined();
      expect(mockBackend.computeGlobalFeatures).toBeDefined();
    });
  });
});

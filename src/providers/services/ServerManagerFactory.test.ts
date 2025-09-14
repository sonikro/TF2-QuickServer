import { beforeEach, describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";
import { Region } from "../../core/domain";
import { OCICredentialsFactory } from "../../core/services/OCICredentialsFactory";
import { PasswordGeneratorService } from "../../core/services/PasswordGeneratorService";
import { ServerAbortManager } from "../../core/services/ServerAbortManager";
import { ServerCommander } from "../../core/services/ServerCommander";
import { ConfigManager } from "../../core/utils/ConfigManager";
import { OCIServerManager } from "../cloud-providers/oracle/OCIServerManager";
import { DefaultServerManagerFactory } from "./ServerManagerFactory";

// Mock the concrete server manager classes
vi.mock('../cloud-providers/aws/ECSServerManager');
vi.mock('../cloud-providers/oracle/OCIServerManager');
vi.mock('./OCIServerManager');

describe('DefaultServerManagerFactory', () => {
    let factory: DefaultServerManagerFactory;
    let mockServerCommander: ServerCommander;
    let mockConfigManager: ConfigManager;
    let mockPasswordGeneratorService: PasswordGeneratorService;
    let mockServerAbortManager: ServerAbortManager;
    let mockOciCredentialsFactory: OCICredentialsFactory;

    beforeEach(() => {
        // Reset all mocks
        vi.clearAllMocks();

        // Create mock dependencies
        mockServerCommander = mock<ServerCommander>();
        mockConfigManager = mock<ConfigManager>();
        mockPasswordGeneratorService = mock<PasswordGeneratorService>();
        mockPasswordGeneratorService.generatePassword = vi.fn().mockReturnValue("mock-password");
        mockServerAbortManager = mock<ServerAbortManager>();
        mockOciCredentialsFactory = mock<OCICredentialsFactory>();

        // Create factory instance
        factory = new DefaultServerManagerFactory({
            serverCommander: mockServerCommander,
            configManager: mockConfigManager,
            passwordGeneratorService: mockPasswordGeneratorService,
            serverAbortManager: mockServerAbortManager,
            ociCredentialsFactory: mockOciCredentialsFactory,
        });
    });

    describe('constructor', () => {
        it('should initialize with all required dependencies', () => {
            expect(factory).toBeInstanceOf(DefaultServerManagerFactory);
        });
    });

    describe('createServerManager', () => {
        describe('AWS regions', () => {
            it('should return a ServerManager for Buenos Aires Local Zone', () => {
                const result = factory.createServerManager(Region.US_EAST_1_BUE_1A);
                
                // Should return a ServerManager (now backed by ECSServerManager)
                expect(result).toBeDefined();
                expect(typeof result.deployServer).toBe('function');
                expect(typeof result.deleteServer).toBe('function');
            });
        });

        describe('Oracle Cloud regions', () => {
            it('should return OCIServerManager for São Paulo region', () => {
                const result = factory.createServerManager(Region.SA_SAOPAULO_1);
                
                expect(OCIServerManager).toHaveBeenCalledWith({
                    serverCommander: mockServerCommander,
                    configManager: mockConfigManager,
                    passwordGeneratorService: mockPasswordGeneratorService,
                    ociClientFactory: expect.any(Function),
                    serverAbortManager: mockServerAbortManager,
                    ociCredentialsFactory: mockOciCredentialsFactory,
                });
                expect(result).toBeInstanceOf(OCIServerManager);
            });

            it('should return OCIServerManager for Bogotá region', () => {
                const result = factory.createServerManager(Region.SA_BOGOTA_1);
                
                expect(OCIServerManager).toHaveBeenCalledWith({
                    serverCommander: mockServerCommander,
                    configManager: mockConfigManager,
                    passwordGeneratorService: mockPasswordGeneratorService,
                    ociClientFactory: expect.any(Function),
                    serverAbortManager: mockServerAbortManager,
                    ociCredentialsFactory: mockOciCredentialsFactory,
                });
                expect(result).toBeInstanceOf(OCIServerManager);
            });

            it('should return OCIServerManager for Chicago region', () => {
                const result = factory.createServerManager(Region.US_CHICAGO_1);
                
                expect(OCIServerManager).toHaveBeenCalledWith({
                    serverCommander: mockServerCommander,
                    configManager: mockConfigManager,
                    passwordGeneratorService: mockPasswordGeneratorService,
                    ociClientFactory: expect.any(Function),
                    serverAbortManager: mockServerAbortManager,
                    ociCredentialsFactory: mockOciCredentialsFactory,
                });
                expect(result).toBeInstanceOf(OCIServerManager);
            });

            it('should return OCIServerManager for Santiago region', () => {
                const result = factory.createServerManager(Region.SA_SANTIAGO_1);
                
                expect(OCIServerManager).toHaveBeenCalledWith({
                    serverCommander: mockServerCommander,
                    configManager: mockConfigManager,
                    passwordGeneratorService: mockPasswordGeneratorService,
                    ociClientFactory: expect.any(Function),
                    serverAbortManager: mockServerAbortManager,
                    ociCredentialsFactory: mockOciCredentialsFactory,
                });
                expect(result).toBeInstanceOf(OCIServerManager);
            });

            it('should return OCIServerManager for Frankfurt region', () => {
                const result = factory.createServerManager(Region.EU_FRANKFURT_1);
                
                expect(OCIServerManager).toHaveBeenCalledWith({
                    serverCommander: mockServerCommander,
                    configManager: mockConfigManager,
                    passwordGeneratorService: mockPasswordGeneratorService,
                    ociClientFactory: expect.any(Function),
                    serverAbortManager: mockServerAbortManager,
                    ociCredentialsFactory: mockOciCredentialsFactory,
                });
                expect(result).toBeInstanceOf(OCIServerManager);
            });
        });
    });

    describe('strategy pattern validation', () => {
        it('should consistently return ServerManager for AWS regions', () => {
            const awsResult = factory.createServerManager(Region.US_EAST_1_BUE_1A);
            
            expect(awsResult).toBeDefined();
            expect(typeof awsResult.deployServer).toBe('function');
            expect(typeof awsResult.deleteServer).toBe('function');
        });

        it('should consistently use Oracle Cloud for OCI regions', () => {
            const ociRegions = [
                Region.SA_SAOPAULO_1,
                Region.SA_BOGOTA_1,
                Region.US_CHICAGO_1,
                Region.SA_SANTIAGO_1,
                Region.EU_FRANKFURT_1,
            ];

            ociRegions.forEach(region => {
                const result = factory.createServerManager(region);
                expect(result).toBeInstanceOf(OCIServerManager);
            });

            expect(OCIServerManager).toHaveBeenCalledTimes(ociRegions.length);
        });
    });
});

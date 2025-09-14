import { beforeEach, describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";
import { Region } from "../../core/domain";
import { OCICredentialsFactory } from "../../core/services/OCICredentialsFactory";
import { PasswordGeneratorService } from "../../core/services/PasswordGeneratorService";
import { ServerAbortManager } from "../../core/services/ServerAbortManager";
import { ServerCommander } from "../../core/services/ServerCommander";
import { ConfigManager } from "../../core/utils/ConfigManager";
import { AWSServerManager, OCIServerManager } from "../cloud-providers";
import { DefaultServerManagerFactory } from "./ServerManagerFactory";

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
            it.each([
                { region: Region.US_EAST_1_BUE_1A, expectedClass: AWSServerManager },
                { region: Region.EU_FRANKFURT_1, expectedClass: OCIServerManager },
                { region: Region.SA_BOGOTA_1, expectedClass: OCIServerManager },
                { region: Region.SA_SANTIAGO_1, expectedClass: OCIServerManager },
                { region: Region.SA_SAOPAULO_1, expectedClass: OCIServerManager },
                { region: Region.US_CHICAGO_1, expectedClass: OCIServerManager },
            ])('should return a ServerManager for $description', ({ region, expectedClass }) => {
                const result = factory.createServerManager(region);

                expect(result).toBeDefined();
                expect(result).toBeInstanceOf(expectedClass);
            });
        });
    })
});

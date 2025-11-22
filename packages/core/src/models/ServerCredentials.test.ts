import { describe, it, expect, vi } from "vitest";
import { mock } from "vitest-mock-extended";
import { Chance } from "chance";
import { ServerCredentials } from "./ServerCredentials";
import { PasswordGeneratorService } from "../services/PasswordGeneratorService";

const chance = new Chance();

describe("ServerCredentials", () => {
    const createTestEnvironment = () => {
        const mockPasswordGeneratorService = mock<PasswordGeneratorService>();
        
        const testData = {
            serverPassword: chance.string({ length: 10, alpha: true, numeric: true }),
            rconPassword: chance.string({ length: 10, alpha: true, numeric: true }),
            tvPassword: chance.string({ length: 10, alpha: true, numeric: true }),
            logSecret: chance.integer({ min: 1, max: 999999 })
        };

        return {
            mocks: {
                passwordGeneratorService: mockPasswordGeneratorService
            },
            data: testData
        };
    };

    describe("constructor", () => {
        it("should create ServerCredentials with all required properties", () => {
            const { data } = createTestEnvironment();
            
            const credentials = new ServerCredentials({
                serverPassword: data.serverPassword,
                rconPassword: data.rconPassword,
                tvPassword: data.tvPassword,
                logSecret: data.logSecret
            });

            expect(credentials.serverPassword).toBe(data.serverPassword);
            expect(credentials.rconPassword).toBe(data.rconPassword);
            expect(credentials.tvPassword).toBe(data.tvPassword);
            expect(credentials.logSecret).toBe(data.logSecret);
        });

    });

    describe("generate static method", () => {
        it("should generate ServerCredentials using PasswordGeneratorService", () => {
            const { mocks } = createTestEnvironment();
            
            const generatedPasswords = {
                serverPassword: chance.string({ length: 10, alpha: true, numeric: true }),
                rconPassword: chance.string({ length: 10, alpha: true, numeric: true }),
                tvPassword: chance.string({ length: 10, alpha: true, numeric: true })
            };
            
            const generatedLogSecret = chance.integer({ min: 1, max: 999999 });

            // Mock the password generator to return specific values
            mocks.passwordGeneratorService.generatePassword.mockReturnValueOnce(generatedPasswords.serverPassword);
            mocks.passwordGeneratorService.generatePassword.mockReturnValueOnce(generatedPasswords.rconPassword);
            mocks.passwordGeneratorService.generatePassword.mockReturnValueOnce(generatedPasswords.tvPassword);
            mocks.passwordGeneratorService.generateNumericPassword.mockReturnValueOnce(generatedLogSecret);

            const credentials = ServerCredentials.generate(mocks.passwordGeneratorService);

            expect(credentials.serverPassword).toBe(generatedPasswords.serverPassword);
            expect(credentials.rconPassword).toBe(generatedPasswords.rconPassword);
            expect(credentials.tvPassword).toBe(generatedPasswords.tvPassword);
            expect(credentials.logSecret).toBe(generatedLogSecret);
        });

        it("should call password generator with correct settings for passwords", () => {
            const { mocks } = createTestEnvironment();
            
            mocks.passwordGeneratorService.generatePassword.mockReturnValue("test-password");
            mocks.passwordGeneratorService.generateNumericPassword.mockReturnValue(123456);

            ServerCredentials.generate(mocks.passwordGeneratorService);

            const expectedPasswordSettings = { 
                alpha: true, 
                length: 10, 
                numeric: true, 
                symbols: false 
            };

            expect(mocks.passwordGeneratorService.generatePassword).toHaveBeenCalledTimes(3);
            expect(mocks.passwordGeneratorService.generatePassword).toHaveBeenNthCalledWith(1, expectedPasswordSettings);
            expect(mocks.passwordGeneratorService.generatePassword).toHaveBeenNthCalledWith(2, expectedPasswordSettings);
            expect(mocks.passwordGeneratorService.generatePassword).toHaveBeenNthCalledWith(3, expectedPasswordSettings);
        });

        it("should call numeric password generator with correct settings for logSecret", () => {
            const { mocks } = createTestEnvironment();
            
            mocks.passwordGeneratorService.generatePassword.mockReturnValue("test-password");
            mocks.passwordGeneratorService.generateNumericPassword.mockReturnValue(123456);

            ServerCredentials.generate(mocks.passwordGeneratorService);

            const expectedNumericSettings = { min: 1, max: 999999 };

            expect(mocks.passwordGeneratorService.generateNumericPassword).toHaveBeenCalledTimes(1);
            expect(mocks.passwordGeneratorService.generateNumericPassword).toHaveBeenCalledWith(expectedNumericSettings);
        });
    });

});

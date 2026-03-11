import { Region } from '../domain';
import { ServerManager } from './ServerManager';

export interface ServerManagerFactory {
    createServerManager(region: Region): ServerManager;
}

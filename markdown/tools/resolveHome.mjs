import os from 'os';
import path  from 'path';

export default function resolveHome(filepath) {
    if (filepath[0] === '~') {
        return path.join(os.homedir(), filepath.slice(1));
    }
    return filepath;
}
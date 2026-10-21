export function printPrerequisites() {
  console.log('One-time trusted HTTPS setup (system changes are manual):');
  if (process.platform === 'win32') {
    console.log('1. Install mkcert: winget install --id FiloSottile.mkcert --exact');
    console.log('2. In a terminal: mkcert -install (accept Windows trust prompt if shown).');
    console.log('3. Open Notepad as Administrator and edit C:\\Windows\\System32\\drivers\\etc\\hosts.');
  } else if (process.platform === 'darwin') {
    console.log('1. brew install mkcert nss');
    console.log('2. mkcert -install');
    console.log('3. sudo nano /etc/hosts');
  } else {
    console.log('1. Install libnss3-tools (Debian/Ubuntu: sudo apt install libnss3-tools).');
    console.log('2. Install mkcert from https://github.com/FiloSottile/mkcert/releases and run mkcert -install.');
    console.log('3. sudo nano /etc/hosts');
  }
  console.log('Add this line, then save and rerun npm run setup:');
  console.log('127.0.0.1 app.security-lab.test sibling.security-lab.test attacker.csrf-lab.test');
  console.log('Use a dedicated browser profile. Never share rootCA-key.pem or tunnel this app.');
}

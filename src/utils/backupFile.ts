import { Alert, Platform } from 'react-native';
import { CachesDirectoryPath, writeFile } from '@dr.pogodin/react-native-fs';
import Share from 'react-native-share';
import { saveDocuments } from '@react-native-documents/picker';

/**
 * Opens Android's "save to" dialog (Storage Access Framework, so no storage permission needed) and
 * writes the file where the user chooses. Returns false if the user cancels or the save fails,
 * so the caller can fall back to the sandboxed file + share sheet.
 */
async function saveToChosenFolder(fileName: string, contents: string, mimeType: string): Promise<boolean> {
  try {
    const tempPath = `${CachesDirectoryPath}/${fileName}`;
    await writeFile(tempPath, contents, 'utf8');
    const [saved] = await saveDocuments({ sourceUris: [`file://${tempPath}`], fileName, mimeType });
    if (saved.error) return false;
    Alert.alert('Backup Saved', 'Your backup was saved to the selected folder.');
    return true;
  } catch {
    return false;
  }
}

/**
 * Writes to the app's cache dir and opens the share sheet. It must be the cache dir:
 * react-native-share's FileProvider only exposes cache/ and Download/, so sharing a file from
 * the documents dir fails on Android.
 */
export async function saveAndShare(fileName: string, contents: string, mimeType: string, dialogTitle: string) {
  const path = `${CachesDirectoryPath}/${fileName}`;
  await writeFile(path, contents, 'utf8');
  await Share.open({ url: `file://${path}`, type: mimeType, filename: fileName, title: dialogTitle, failOnCancel: false });
}

/** Android: "save to" dialog, falling back to the share sheet. Other platforms: share sheet. */
export async function saveBackupFile(fileName: string, contents: string) {
  if (Platform.OS === 'android' && (await saveToChosenFolder(fileName, contents, 'application/json'))) return;
  await saveAndShare(fileName, contents, 'application/json', 'Save SpendHive Backup');
}

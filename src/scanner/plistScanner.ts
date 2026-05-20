import type { Issue, ScanContext } from '../types.js';
import { relativePath } from '../utils/fileSystem.js';
import { parsePlistFile } from '../utils/plist.js';
import { searchFiles } from '../utils/textSearch.js';

const permissionRules = [
  {
    key: 'NSCameraUsageDescription',
    title: 'Missing camera usage description',
    patterns: [/AVCaptureDevice/i, /UIImagePickerController/i, /\bcamera\b/i],
    critical: true,
  },
  {
    key: 'NSMicrophoneUsageDescription',
    title: 'Missing microphone usage description',
    patterns: [/AVAudioRecorder/i, /AVCaptureAudioDataOutput/i, /\bmicrophone\b/i],
    critical: true,
  },
  {
    key: 'NSSpeechRecognitionUsageDescription',
    title: 'Missing speech recognition usage description',
    patterns: [/SFSpeechRecognizer/i, /Speech framework/i, /requestAuthorization/i],
    critical: true,
  },
  {
    key: 'NSPhotoLibraryUsageDescription',
    title: 'Missing photo library usage description',
    patterns: [/PHPhotoLibrary/i, /PhotosUI/i, /PHPickerViewController/i, /photo library/i],
    critical: false,
  },
  {
    key: 'NSPhotoLibraryAddUsageDescription',
    title: 'Missing photo library add usage description',
    patterns: [/UIImageWriteToSavedPhotosAlbum/i, /performChanges/i],
    critical: false,
  },
  {
    key: 'NSLocationWhenInUseUsageDescription',
    title: 'Missing location usage description',
    patterns: [/CLLocationManager/i, /CoreLocation/i, /requestWhenInUseAuthorization/i],
    critical: true,
  },
  {
    key: 'NSLocationAlwaysAndWhenInUseUsageDescription',
    title: 'Missing always-on location usage description',
    patterns: [/requestAlwaysAuthorization/i, /allowsBackgroundLocationUpdates/i],
    critical: true,
  },
  { key: 'NSFaceIDUsageDescription', title: 'Missing Face ID usage description', patterns: [/LAContext/i, /biometry/i, /FaceID/i], critical: false },
  { key: 'NSContactsUsageDescription', title: 'Missing contacts usage description', patterns: [/CNContact/i, /Contacts/i], critical: true },
  { key: 'NSCalendarsUsageDescription', title: 'Missing calendars usage description', patterns: [/EventKit/i, /EKEvent/i], critical: false },
  { key: 'NSRemindersUsageDescription', title: 'Missing reminders usage description', patterns: [/EKReminder/i], critical: false },
  { key: 'NSBluetoothAlwaysUsageDescription', title: 'Missing Bluetooth usage description', patterns: [/CoreBluetooth/i, /CBCentralManager/i], critical: false },
  { key: 'NSMotionUsageDescription', title: 'Missing motion usage description', patterns: [/CoreMotion/i, /CMMotionManager/i], critical: false },
  { key: 'NSHealthShareUsageDescription', title: 'Missing Health share usage description', patterns: [/HealthKit/i, /HKHealthStore/i], critical: true },
  { key: 'NSHealthUpdateUsageDescription', title: 'Missing Health update usage description', patterns: [/HKSample/i, /saveObject/i], critical: false },
];

export async function scanPlists(context: ScanContext): Promise<Issue[]> {
  const issues: Issue[] = [];
  const foundKeys = new Map<string, string>();

  for (const file of context.plistFiles) {
    const parsed = await parsePlistFile(file);
    const rel = relativePath(context.root, file);
    const raw = parsed.raw ?? '';

    for (const rule of permissionRules) {
      if (parsed.data?.[rule.key] || raw.includes(rule.key)) {
        foundKeys.set(rule.key, rel);
        issues.push({
          id: `plist.${rule.key}.found`,
          title: `${rule.key} found`,
          severity: 'info',
          category: 'Info.plist',
          description: `The app declares ${rule.key}. Review the wording to make sure it clearly explains the user-facing reason.`,
          filePath: rel,
        });
      }
    }

    if (!parsed.data && parsed.error) {
      issues.push({
        id: 'plist.parse_failed',
        title: 'Info.plist could not be parsed',
        severity: 'manual_review',
        category: 'Info.plist',
        description: 'AppLaunchGuard could not parse this plist, so it used safer text checks where possible.',
        filePath: rel,
        evidence: parsed.error,
      });
    }
  }

  for (const rule of permissionRules) {
    if (foundKeys.has(rule.key)) continue;
    const matches = await searchFiles(context.root, context.swiftFiles, rule.patterns);
    if (matches.length === 0) continue;
    const first = matches[0];
    issues.push({
      id: `plist.${rule.key}.missing`,
      title: rule.title,
      severity: rule.critical ? 'critical' : 'warning',
      category: 'Info.plist',
      description: `Code appears to use a capability that may require ${rule.key}, but the key was not found in Info.plist.`,
      filePath: first.relativeFilePath,
      evidence: first.line,
      suggestedFix: `Add ${rule.key} to Info.plist with a clear user-facing reason.`,
      docsUrl: 'https://developer.apple.com/documentation/bundleresources/information-property-list',
    });
  }

  if (context.plistFiles.length === 0) {
    issues.push({
      id: 'plist.missing_info_plist',
      title: 'Info.plist not found',
      severity: 'warning',
      category: 'Info.plist',
      description: 'No Info.plist file was found. Some modern projects generate one at build time, but App Store privacy permission keys still need manual review.',
      suggestedFix: 'Confirm where Info.plist values are defined for the app target.',
    });
  }

  return issues;
}

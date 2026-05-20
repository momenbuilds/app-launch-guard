import path from 'node:path';
import type { ProjectSummary } from '../types.js';
import { relativePath } from '../utils/fileSystem.js';

export function detectIosProject(root: string, files: string[]): ProjectSummary {
  const rel = files.map((file) => relativePath(root, file));
  const detectedProjectFiles = rel.filter((file) => file.endsWith('.xcodeproj/project.pbxproj') || file.includes('.xcodeproj/'));
  const detectedWorkspaceFiles = rel.filter((file) => file.includes('.xcworkspace/'));
  const detectedPbxprojFiles = rel.filter((file) => file.endsWith('project.pbxproj'));
  const detectedPlistFiles = rel.filter((file) => file.endsWith('Info.plist'));
  const detectedPrivacyManifestFiles = rel.filter((file) => file.endsWith('PrivacyInfo.xcprivacy'));
  const swiftFiles = rel.filter((file) => file.endsWith('.swift'));
  const packageManagers: string[] = [];

  if (rel.some((file) => path.basename(file) === 'Package.swift')) packageManagers.push('Swift Package Manager');
  if (rel.some((file) => path.basename(file) === 'Podfile')) packageManagers.push('CocoaPods');
  if (rel.some((file) => path.basename(file) === 'Cartfile')) packageManagers.push('Carthage');

  let score = 0;
  if (detectedProjectFiles.length > 0) score += 30;
  if (detectedWorkspaceFiles.length > 0) score += 20;
  if (detectedPbxprojFiles.length > 0) score += 20;
  if (detectedPlistFiles.length > 0) score += 15;
  if (detectedPrivacyManifestFiles.length > 0) score += 10;
  if (swiftFiles.length > 0) score += Math.min(20, swiftFiles.length * 2);
  if (rel.some((file) => file.includes('.xcassets/'))) score += 10;
  if (rel.some((file) => file.endsWith('.storyboard'))) score += 8;
  if (rel.some((file) => file.endsWith('.entitlements'))) score += 8;
  if (packageManagers.length > 0) score += 8;

  const confidenceScore = Math.min(100, score);
  const warnings: string[] = [];
  if (confidenceScore === 0) {
    warnings.push('AppLaunchGuard could not confidently detect an iOS project in this folder.');
  } else if (confidenceScore < 40) {
    warnings.push('Only a few iOS project signals were found. The scan will continue, but results may be incomplete.');
  }

  return {
    projectRoot: root,
    confidenceScore,
    detectedProjectFiles,
    detectedWorkspaceFiles,
    detectedPbxprojFiles,
    detectedPlistFiles,
    detectedPrivacyManifestFiles,
    detectedSwiftFilesCount: swiftFiles.length,
    detectedPackageManagers: packageManagers,
    warnings,
  };
}

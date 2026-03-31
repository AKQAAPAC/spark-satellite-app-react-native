#!/usr/bin/env node
'use strict';
// Patches @expo/config-plugins for iOS prebuild compatibility.
const path = require('path');
const fs = require('fs');

const root = path.join(__dirname, '..', 'node_modules', '@expo', 'config-plugins', 'build');

// Xcodeproj.js: ensure valid project instance in mod chain
const xcodeprojPath = path.join(root, 'ios', 'utils', 'Xcodeproj.js');
if (fs.existsSync(xcodeprojPath)) {
  let content = fs.readFileSync(xcodeprojPath, 'utf8');
  const ensureGroupOpen = 'function ensureGroupRecursively(project, filepath) {\n  const components';
  if (content.includes(ensureGroupOpen) && !content.includes('project = ensurePbxProject(project)')) {
    content = content.replace(
      ensureGroupOpen,
      'function ensureGroupRecursively(project, filepath) {\n  project = ensurePbxProject(project);\n  const components'
    );
  }
  const getPbxprojBlock = `/**
 * Get the pbxproj for the given path
 */
function getPbxproj(projectRoot) {`;
  const ensurePbxProjectBlock = `/**
 * Ensure we have a valid pbxProject instance; re-load from filepath or cwd if needed.
 */
function ensurePbxProject(project) {
  if (project && typeof project.getFirstProject === 'function') return project;
  if (project && project.filepath) {
    const projectRoot = _path().default.dirname(_path().default.dirname(_path().default.dirname(project.filepath)));
    return getPbxproj(projectRoot);
  }
  if (project) {
    return getPbxproj(process.cwd());
  }
  return project;
}

/**
 * Get the pbxproj for the given path
 */
function getPbxproj(projectRoot) {`;
  if (!content.includes('function ensurePbxProject(project)')) {
    content = content.replace(getPbxprojBlock, ensurePbxProjectBlock);
  } else if (!content.includes('getPbxproj(process.cwd())')) {
    // Add fallback when project root is not on project
    content = content.replace(
      'return getPbxproj(projectRoot);\n  }\n  return project;\n}\n\n/**\n * Get the pbxproj for the given path\n */\nfunction getPbxproj(projectRoot) {',
      'return getPbxproj(projectRoot);\n  }\n  if (project) {\n    return getPbxproj(process.cwd());\n  }\n  return project;\n}\n\n/**\n * Get the pbxproj for the given path\n */\nfunction getPbxproj(projectRoot) {'
    );
  }
  // Normalize project in addFileToGroupAndLink
  const addFileToGroupAndLinkOpen = 'targetUuid\n}) {\n  const group = pbxGroupByPathOrAssert(project, groupName);';
  if (content.includes(addFileToGroupAndLinkOpen) && !content.includes('project = ensurePbxProject(project);\n  const group = pbxGroupByPathOrAssert(project, groupName);')) {
    content = content.replace(
      'targetUuid\n}) {\n  const group = pbxGroupByPathOrAssert(project, groupName);',
      'targetUuid\n}) {\n  project = ensurePbxProject(project);\n  const group = pbxGroupByPathOrAssert(project, groupName);'
    );
  }
  fs.writeFileSync(xcodeprojPath, content);
}

// withIosBaseMods.js: xcodeproj write supports modResults that need rehydration
const withIosPath = path.join(root, 'plugins', 'withIosBaseMods.js');
if (fs.existsSync(withIosPath)) {
  let content = fs.readFileSync(withIosPath, 'utf8');
  const newWrite = `async write(filePath, {
      modResults
    }) {
      let out = modResults;
      if (typeof modResults.writeSync !== 'function') {
        const project = _xcode().default.project(filePath);
        project.parseSync();
        if (modResults && modResults.hash != null) project.hash = modResults.hash;
        out = project;
      }
      await writeFile(filePath, out.writeSync());
    }`;
  const alreadyPatched = 'if (typeof modResults.writeSync !== \'function\')';
  if (!content.includes(alreadyPatched)) {
    const originalWrite = `async write(filePath, {
      modResults
    }) {
      await writeFile(filePath, modResults.writeSync());
    }`;
    if (content.includes(originalWrite)) {
      content = content.replace(originalWrite, newWrite);
      fs.writeFileSync(withIosPath, content);
    }
  } else if (!content.includes('project.parseSync();')) {
    const oldPatched = `async write(filePath, {
      modResults
    }) {
      let out = modResults;
      if (typeof modResults.writeSync !== 'function' && modResults && modResults.hash != null) {
        const project = _xcode().default.project(filePath);
        project.hash = modResults.hash;
        out = project;
      }
      await writeFile(filePath, out.writeSync());
    }`;
    if (content.includes(oldPatched)) {
      content = content.replace(oldPatched, newWrite);
      fs.writeFileSync(withIosPath, content);
    }
  }
}

console.log('Applied iOS prebuild patches');

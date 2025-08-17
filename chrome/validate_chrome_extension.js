#!/usr/bin/env node
/**
 * Chrome Extension Validation Script
 * Validates that all required files exist and manifest is properly configured
 */

const fs = require('fs');
const path = require('path');

function validateChromeExtension() {
  console.log('🔍 Validating Chrome Extension...\n');
  
  const errors = [];
  const warnings = [];
  
  // Check required files
  const requiredFiles = [
    'manifest.json',
    'background.js',
    'content.js',
    'popup.html',
    'popup.js',
    'styles.css',
    'utils.js'
  ];
  
  const requiredIcons = [
    'icons/icon-16.png',
    'icons/icon-32.png', 
    'icons/icon-48.png',
    'icons/icon-128.png'
  ];
  
  // Validate required files exist
  requiredFiles.forEach(file => {
    if (!fs.existsSync(file)) {
      errors.push(`❌ Missing required file: ${file}`);
    } else {
      console.log(`✅ Found: ${file}`);
    }
  });
  
  // Validate icons exist
  requiredIcons.forEach(icon => {
    if (!fs.existsSync(icon)) {
      errors.push(`❌ Missing required icon: ${icon}`);
    } else {
      console.log(`✅ Found: ${icon}`);
    }
  });
  
  // Validate manifest.json
  if (fs.existsSync('manifest.json')) {
    try {
      const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
      
      // Check manifest version
      if (manifest.manifest_version !== 3) {
        errors.push(`❌ Invalid manifest_version: ${manifest.manifest_version} (should be 3)`);
      } else {
        console.log('✅ Manifest V3 format');
      }
      
      // Check service worker
      if (!manifest.background?.service_worker) {
        errors.push('❌ Missing background.service_worker in manifest');
      } else if (manifest.background.service_worker !== 'background.js') {
        warnings.push(`⚠️  Service worker points to: ${manifest.background.service_worker}`);
      } else {
        console.log('✅ Service worker configured');
      }
      
      // Check required permissions
      const requiredPermissions = ['storage', 'tabs', 'activeTab'];
      requiredPermissions.forEach(perm => {
        if (!manifest.permissions?.includes(perm)) {
          errors.push(`❌ Missing permission: ${perm}`);
        } else {
          console.log(`✅ Permission: ${perm}`);
        }
      });
      
      // Check host permissions
      if (!manifest.host_permissions?.includes('*://youtube.com/*')) {
        errors.push('❌ Missing host permission for youtube.com');
      } else {
        console.log('✅ YouTube host permissions');
      }
      
      // Check action popup
      if (!manifest.action?.default_popup) {
        errors.push('❌ Missing action.default_popup');
      } else {
        console.log('✅ Action popup configured');
      }
      
      // Check content scripts
      if (!manifest.content_scripts?.length) {
        errors.push('❌ Missing content_scripts');
      } else {
        console.log('✅ Content scripts configured');
      }
      
    } catch (err) {
      errors.push(`❌ Invalid manifest.json: ${err.message}`);
    }
  }
  
  // Summary
  console.log('\n📊 Validation Summary:');
  console.log(`✅ Valid: ${requiredFiles.length + requiredIcons.length - errors.length}`);
  console.log(`❌ Errors: ${errors.length}`);
  console.log(`⚠️  Warnings: ${warnings.length}`);
  
  if (errors.length > 0) {
    console.log('\n🚨 Errors found:');
    errors.forEach(error => console.log(error));
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    warnings.forEach(warning => console.log(warning));
  }
  
  if (errors.length === 0) {
    console.log('\n🎉 Chrome extension validation passed!');
    console.log('\nNext steps:');
    console.log('1. Open chrome://extensions/ in Chrome');
    console.log('2. Enable "Developer mode"');
    console.log('3. Click "Load unpacked" and select this directory');
    console.log('4. Test the extension on YouTube');
    return true;
  } else {
    console.log('\n❌ Chrome extension validation failed!');
    console.log('Please fix the errors above before loading the extension.');
    return false;
  }
}

// Run validation if called directly
if (require.main === module) {
  process.chdir(__dirname);
  const isValid = validateChromeExtension();
  process.exit(isValid ? 0 : 1);
}

module.exports = validateChromeExtension;
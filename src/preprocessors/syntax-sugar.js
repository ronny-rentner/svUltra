import { createScopedLogger } from '../logger.js';

const log = createScopedLogger('syntax-sugar', 'info');

export default function syntaxSugar(replacements = [], options = {}) {
  // Default configuration with a single list of ignore tags and their options
  const defaultIgnoreTags = {
    'svultra:ignore': { processTag: false, escapeCurlyBraces: true },
    'CodeExample': { processTag: true, escapeCurlyBraces: true }
  };
  
  const config = {
    ignoreTags: { ...defaultIgnoreTags, ...(options.ignoreTags || {}) },
    ...options
  };
  
  // Validate tag names are safe for regex
  const validTagPattern = /^[a-zA-Z0-9:]+$/;
  Object.keys(config.ignoreTags).forEach(tag => {
    if (!validTagPattern.test(tag)) {
      throw new Error(`Invalid tag name: ${tag}. Tag names must contain only alphanumeric characters and colons.`);
    }
  });
  
  return {
    markup({ content, filename }) {
      if (filename.includes('node_modules')) {
        return;
      }

      log.debug('Running syntaxSugar preprocessor', filename);
      
      let modifiedContent = content;
      const preservedSections = {};
      
      // Process each tag according to its configuration
      for (const [tagName, tagConfig] of Object.entries(config.ignoreTags)) {
        const { processTag, escapeCurlyBraces } = tagConfig;
        
        // Initialize array for this tag if needed
        if (!preservedSections[tagName]) {
          preservedSections[tagName] = [];
        }
        
        if (processTag) {
          // Process tag but handle content according to configuration
          const tagRegex = new RegExp(`(<${tagName}[^>]*>)([\\s\\S]*?)(</${tagName}>)`, 'gi');
          
          modifiedContent = modifiedContent.replace(tagRegex, (match, openTag, content, closeTag) => {
            if (escapeCurlyBraces) {
              // Replace curly braces and HTML tags with HTML entities
              const escapedContent = content
                .replace(/\{/g, '&lbrace;')
                .replace(/\}/g, '&rbrace;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
              return openTag + escapedContent + closeTag;
            } else {
              // Just preserve content without modification
              const placeholder = `__PRESERVED_${tagName}_${preservedSections[tagName].length}__`;
              preservedSections[tagName].push(content);
              return openTag + placeholder + closeTag;
            }
          });
        } else {
          // Preserve the entire tag including tag and content
          const tagRegex = new RegExp(`<${tagName}[^>]*>[\\s\\S]*?</${tagName}>`, 'gi');
          
          modifiedContent = modifiedContent.replace(tagRegex, (match) => {
            const placeholder = `__PRESERVED_WHOLE_${tagName}_${preservedSections[tagName].length}__`;
            preservedSections[tagName].push(match);
            return placeholder;
          });
        }
      }
      
      // Apply replacements to the modified content
      replacements.forEach(([searchValue, replaceValue]) => {
        if (typeof searchValue === 'string') {
          modifiedContent = modifiedContent.split(searchValue).join(replaceValue);
        } else if (searchValue instanceof RegExp) {
          modifiedContent = modifiedContent.replace(searchValue, replaceValue);
        }
      });
      
      // Restore preserved sections
      for (const [tagName, sections] of Object.entries(preservedSections)) {
        for (let i = 0; i < sections.length; i++) {
          // Restore whole tag sections
          if (modifiedContent.includes(`__PRESERVED_WHOLE_${tagName}_${i}__`)) {
            modifiedContent = modifiedContent.replace(
              `__PRESERVED_WHOLE_${tagName}_${i}__`, 
              sections[i]
            );
          }
          
          // Restore content-only sections
          if (modifiedContent.includes(`__PRESERVED_${tagName}_${i}__`)) {
            modifiedContent = modifiedContent.replace(
              `__PRESERVED_${tagName}_${i}__`, 
              sections[i]
            );
          }
        }
      }

      return {
        code: modifiedContent,
      };
    },
  };
}

# Print Source Code Preprocessor

## Overview

The Print Source Code preprocessor is a development tool that logs the transformed source code of specific components to the console. This is useful for debugging preprocessor chains and understanding how your components are being transformed by other preprocessors.

## How It Works

This preprocessor:

1. Identifies components by filename
2. Prints their processed source code to the console
3. Passes the code through unchanged (doesn't modify the component)

## Usage

You can print the processed source code of specific components:

```javascript
export default {
  preprocess: [
    syntaxSugar(),

    // Button.svelte after the syntax sugar expansion
    printSourceCode('Button.svelte'),

    attributeTransformer(),

    // Button.svelte after the attribute rewrite
    printSourceCode('Button.svelte'),
  ],
};
```

The name is matched as a substring of the full file path, so
`'Button.svelte'` also matches `IconButton.svelte`, and a fragment like
`'components/'` matches every file under that folder.

## Debug Preprocessor Chain

A powerful way to use this is to place it at different points in your preprocessor chain to see the intermediate transformations:

```javascript
export default {
  preprocess: [
    syntaxSugar(replacements),
    
    // See what happens after syntax sugar
    printSourceCode('Button.svelte'),
    
    attributeTransformer({...}),
    
    // See what happens after attribute transformation
    printSourceCode('Button.svelte'),
    
    transformComponentStyles(),
    
    // See the final result
    printSourceCode('Button.svelte'),
  ],
};
```

## Usage in Config

```javascript
import { printSourceCode } from 'svultra';

export default {
  preprocess: [
    // other preprocessors...
    
    // Place this after preprocessors whose output you want to see
    printSourceCode('MyComponent.svelte'),
    
    // other preprocessors...
  ],
};
```

## Notes

- This is purely a development tool and should be removed or commented out in production builds
- Very useful for debugging complex preprocessor chains
- Has no effect on the actual compilation result - just logs to the console
- Can be placed at different points in your preprocessor chain to see intermediate transformations
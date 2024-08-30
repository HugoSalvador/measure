import path from "path"
import fs from "fs"

export const fileToGenerativePart = async (code: string, mimeType: string) => {
    
      return {
        inlineData: {
          data: code,
          mimeType
        },
      };
}



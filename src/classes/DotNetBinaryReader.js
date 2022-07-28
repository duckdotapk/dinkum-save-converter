//
// Imports
//

import { BinaryReader } from "./BinaryReader.js";

//
// Exports
//

/**
 * A binary reader with additional functions specific to Microsoft .NET BinaryFormatter files.
 */
export class DotNetBinaryReader extends BinaryReader
{
	/**
	 * Reads a primitive value
	 * 
	 * @param {Number} type The type of primitive to read.
	 * @returns 
	 */
	readPrimitive(type)
	{
		switch (type)
		{
			case 1: // Boolean
			case 2: // Byte
				return this.readUInt8();

			case 3: // Char
				return this.readChar();

			case 4: // Unused
				throw new Error("Invalid primitive type:", type);

			case 5: // Decimal
				return this.readString();

			case 6: // Double
				return this.readFloat64();

			case 7: // Short (Int16)
				return this.readInt16();
			
			case 8: // Integer (Int32)
				return this.readInt32();

			case 9: // Long (Int64)
				return this.readInt64();
			
			case 10: // Signed Byte
				return this.readInt8();

			case 11: // Single
				return this.readFloat32();

			case 12: // Timespan						
			case 13: // Datetime
				return this.readInt64();

			case 14: // UShort (UInt16)
				return this.readUInt16();

			case 15: // UInteger (UInt32)
				return this.readUInt32();

			case 16: // ULong (UInt64)
				return this.readUInt64();

			case 17: // Null
				return;

			case 18: // String
				return this.readString();

			default:
				throw new Error("Invalid primitive type:", type);
		}
	}
}
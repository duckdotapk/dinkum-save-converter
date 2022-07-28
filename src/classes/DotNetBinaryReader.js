//
// Imports
//

import { BinaryReader } from "./BinaryReader.js";

//
// Type Definitions
//

/**
 * @typedef {Object} BinaryFormatterData
 * @property {SerializationHeader} serializationHeader
 * @property {BinaryLibrary} binaryLibrary
 * @property {SerializedClass} serializedClass
 */

/**
 * @typedef {Object} SerializationHeader
 * @property {Number} rootId
 * @property {Number} headerId
 * @property {Number} majorVersion
 * @property {Number} minorVersion
 */

/**
 * @typedef {Object} BinaryLibrary
 * @property {Number} id
 * @property {String} name
 */

/**
 * @typedef {Object} SerializedClass
 * @property {Number} objectId
 * @property {String} name The name of the class that was serialized.
 * @property {Number} memberCount The count of members in this class.
 * @property {Array<String>} memberNames An array of all of the names of this class' members.
 * @property {Array<SerializedClassMemberType>} memberTypes Type information for the class' members.
 * @property {Array<SerializedClassMemberValue>} memberValues The values for each member.
 */

/**
 * @typedef {Object} SerializedClassMemberType
 * @property {Number} id
 * @property {Number|SerializedClassMemberTypeDetails} additionalInfo
 */

/**
 * @typedef {Object} SerializedClassMemberTypeDetails
 * @property {String} name
 * @property {Number} libraryId
 */

/**
 * @typedef {Object} SerializedClassMemberValue
 */

//
// Exports
//

/**
 * A binary reader with additional functions specific to Microsoft .NET BinaryFormatter files.
 */
export class DotNetBinaryReader extends BinaryReader
{
	/**
	 * @type {import("node:fs")}
	 */
	static #fs = null;

	/**
	 * Reads a Microsoft .NET BinaryFormatter file from the disk.
	 * 
	 * Only works in Node.js.
	 * 
	 * @param {String} path The path to the file.
	 * @author Loren Goodwin
	 */
	static async readFile(path)
	{
		if (DotNetBinaryReader.#fs == null)
		{
			DotNetBinaryReader.#fs = await import("node:fs");
		}

		const fs = DotNetBinaryReader.#fs;

		const nodeBuffer = await fs.promises.readFile(path);

		const arrayBuffer = new Uint8Array(nodeBuffer).buffer;

		return await this.readArrayBuffer(arrayBuffer);
	}

	/**
	 * Parses the given ArrayBuffer as a binary file created with a Microsoft .NET BinaryFormatter.
	 * 
	 * @param {ArrayBuffer} arrayBuffer
	 * @returns {BinaryFormatterData}
	 * @author Loren Goodwin
	 * @author Proddy
	 */
	static async readArrayBuffer(arrayBuffer)
	{
		const binaryReader = new DotNetBinaryReader(arrayBuffer);
	
		let recordId = 0x00;
	
		/** @type {BinaryFormatterData} */
		const data = {};
		
		// Note: 0B signifies the end of one of these files
		while(recordId != 0x0B)
		{
			if (recordId == 0x00)
			{
				data.serializationHeader = binaryReader.#readSerializationHeader();
			}
			else if (recordId == 0x0C) 
			{
				data.binaryLibrary = binaryReader.#readBinaryLibrary();
			}
			else if (recordId == 0x05) 
			{
				data.serializedClass = binaryReader.#readSerializedClass();
		
				break;
			}
			else 
			{
				throw new Error("Unexpected record ID:", recordId);
			}
		
			recordId = binaryReader.readUInt8();		
		}
	
		return data;
	}
	
	/**
	 * Reads a primitive value
	 * 
	 * @param {Number} type The type of primitive to read.
	 * @returns {Number|String}
	 * @author Loren Goodwin
	 * @author Proddy
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

	/**
	 * Reads the serialization header.
	 * 
	 * @returns {SerializationHeader}
	 * @author Loren Goodwin
	 * @author Proddy
	 */
	#readSerializationHeader()
	{
		/** @type {SerializationHeader} */
		const serializationHeader =
		{
			rootId: this.readUInt32(),
			headerId: this.readUInt32(),
			majorVersion: this.readUInt32(),
			minorVersion: this.readUInt32(),
		};

		return serializationHeader;
	}

	/**
	 * Reads the binary library.
	 * 
	 * @returns {BinaryLibrary}
	 */
	#readBinaryLibrary()
	{
		/** @type {BinaryLibrary} */
		const binaryLibrary =
		{
			id: this.readUInt32(),
			name: this.readString(),
		};

		return binaryLibrary;
	}

	/**
	 * Reads the serialized class.
	 * 
	 * @returns {SerializedClass}
	 */
	#readSerializedClass()
	{
		/** @type {SerializedClass} */
		const serializedClass = 
		{
			objectId: this.readUInt32(),
			name: this.readString(),
			memberCount: this.readUInt32(),
		};

		//
		// Get Member Names
		//

		serializedClass.memberNames = [];

		for(let i = 0; i < serializedClass.memberCount; i++)
		{
			serializedClass.memberNames.push(this.readString());
		}

		//
		// Get Member Types
		//

		serializedClass.memberTypes = [];

		for(let i = 0; i < serializedClass.memberCount; i++)
		{
			/** @type {SerializedClassMemberType} */
			const type =
			{
				id: this.readUInt8(),
				additionalInfo: undefined,
			};

			serializedClass.memberTypes.push(type);
		}

		//
		// Get Additional Type Info
		//

		for (let i = 0; i < serializedClass.memberCount; i++)
		{
			/** @type {SerializedClassMemberType} */
			const type = serializedClass.memberTypes[i];

			switch(type.id)
			{
				case 0:
				case 7:
					type.additionalInfo = this.readUInt8();

					break;

				case 1:
					// No Additional Data, Do Nothing
					break;

				case 3:
					type.additionalInfo = this.readString();	

					break;

				case 4:
					type.additionalInfo = 
					{
						name: this.readString(),
						libraryId: this.readUInt8(),
					};

					break;

				default:
					throw new Error("Unexpected member type:", type.id);
			}
		}

		//
		// Get Member Values
		//

		// NOTE: If this isn't 2, the file is fucked
		//	Should probably do error handling here
		//	Josh said this is an identifier that explains how to read the rest of the file
		serializedClass.libraryId = this.readUInt32();

		serializedClass.memberValues = [];

		for(let i = 0; i < serializedClass.memberCount; i++)
		{
			const type = serializedClass.memberTypes[i];

			const value = {};

			switch (type.id)
			{
				case 0:
					value.value = this.readPrimitive(type.additionalInfo);	
					break;

				case 1:
				{
					value.recordType = this.readUInt8();

					if (value.recordType != 6)
					{
						throw new Error("Unknown string record type:", value.recordType);
					}

					value.objectId = this.readUInt32();

					value.value = this.readString();

					break;
				}

				case 7:
				{
					value.recordType = this.readUInt8();

					value.index = this.readUInt32();

					break;
				}

				default:
				{
					throw new Error("Unknown member type:", type.id);
				}
			}

			serializedClass.memberValues.push(value);
		}

		//
		// Get Array Member Values
		//

		for(let i = 0; i < serializedClass.memberCount; i++)
		{
			const type = serializedClass.memberTypes[i];

			if (type.id != 7)
			{
				continue;
			}

			const value = serializedClass.memberValues[i];

			value.recordType = this.readUInt8();

			// Note: Skip over padding
			while (value.recordType == 0)
			{
				value.recordType = this.readUInt8();
			}

			value.id = this.readUInt32();

			value.length = this.readUInt32();

			value.primitiveType = this.readUInt8();

			value.value = [];

			for(let i = 0; i < value.length; i++)
			{
				value.value.push(this.readPrimitive(value.primitiveType));
			}
		}

		return serializedClass;
	} 
}
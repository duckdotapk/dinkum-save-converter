//
// Imports
//

import { BinaryReader } from "./BinaryReader.js";

//
// Type Definitions
//

/**
 * @typedef {Object} BinaryFormatterData
 * @property {SerializedStreamHeader} serializedStreamHeader
 * @property {BinaryLibrary} binaryLibrary
 * @property {ClassWithMembersAndTypes} serializedClass
 */

/**
 * @typedef {Object} SerializedStreamHeader
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
 * @typedef {Object} ClassWithMembersAndTypes
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
	 * An enumeration containing valid record types.
	 * 
	 * @see https://winprotocoldoc.blob.core.windows.net/productionwindowsarchives/MS-NRBF/[MS-NRBF].pdf#%5B%7B%22num%22%3A72%2C%22gen%22%3A0%7D%2C%7B%22name%22%3A%22XYZ%22%7D%2C69%2C583%2C0%5D
	 */
	static RecordTypeEnumeration =
		{
			SerializedStreamHeader: 0,
			ClassWithId: 1,
			SystemClassWithMembers: 2,
			ClassWithMembers: 3,
			SystemClassWithMembersAndTypes: 4,
			ClassWithMembersAndTypes: 5,
			BinaryObjectString: 6,
			BinaryArray: 7,
			MemberPrimitiveTyped: 8,
			MemberReference: 9,
			ObjectNull: 10,
			MessageEnd: 11,
			BinaryLibrary: 12,
			ObjectNullMultiple256: 13,
			ObjectNullMultiple: 14,
			ArraySinglePrimitive: 15,
			ArraySingleObject: 16,
			ArraySingleString: 17,
			MethodCall: 21,
			MethodReturn: 22,
		};

	/**
	 * An enumeration containing valid binary types.
	 * 
	 * @see https://winprotocoldoc.blob.core.windows.net/productionwindowsarchives/MS-NRBF/[MS-NRBF].pdf#%5B%7B%22num%22%3A75%2C%22gen%22%3A0%7D%2C%7B%22name%22%3A%22XYZ%22%7D%2C69%2C434%2C0%5D
	 */
	static BinaryTypeEnumeration =
		{
			Primitive: 0,
			String: 1,
			Object: 2,
			SystemClass: 3,
			Class: 4,
			ObjectArray: 5,
			StringArray: 6,
			PrimitiveArray: 7,
		};

	/**
	 * An enumeration containing valid primitive types.
	 * 
	 * @see https://winprotocoldoc.blob.core.windows.net/productionwindowsarchives/MS-NRBF/[MS-NRBF].pdf#%5B%7B%22num%22%3A77%2C%22gen%22%3A0%7D%2C%7B%22name%22%3A%22XYZ%22%7D%2C69%2C625%2C0%5D
	 */
	static PrimitiveTypeEnumeration =
		{
			Boolean: 1,
			Byte: 2,
			Char: 3,
			Unused: 4,
			Decimal: 5,
			Double: 6,
			Int16: 7,
			Int32: 8,
			Int64: 9,
			SByte: 10,
			Single: 11,
			TimeSpan: 12,
			DateTime: 13,
			UInt16: 14,
			UInt32: 15,
			UInt64: 16,
			Null: 17,
			String: 18,
		};

	/**
	 * An enumeration containing message flags.
	 * 
	 * @see https://winprotocoldoc.blob.core.windows.net/productionwindowsarchives/MS-NRBF/[MS-NRBF].pdf#%5B%7B%22num%22%3A79%2C%22gen%22%3A0%7D%2C%7B%22name%22%3A%22XYZ%22%7D%2C69%2C469%2C0%5D
	 */
	static MessageFlags =
		{
			NoArgs: 0x00000001,
			ArgsInline: 0x00000002,
			ArgsIsArray: 0x00000004,
			ArgsInArray: 0x00000008,
			NoContext: 0x00000010,
			ContextInline: 0x00000020,
			ContextInArray: 0x00000040,
			MethodSignatureInArray: 0x00000080,
			PropertiesInArray: 0x00000100,
			NoReturnValue: 0x00000200,
			ReturnValueVoid: 0x00000400,
			ReturnValueInline: 0x00000800,
			ReturnValueInArray: 0x00001000,
			ExceptionInArray: 0x00002000,
			GenericMethod: 0x00008000,
		};

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

		return await this.readSerializationStream(arrayBuffer);
	}

	/**
	 * Parses the given ArrayBuffer as a serialization stream created with a Microsoft .NET BinaryFormatter.
	 * 
	 * @param {ArrayBuffer} serializationStream
	 * @returns {BinaryFormatterData}
	 * @author Loren Goodwin
	 * @author Proddy
	 */
	static async readSerializationStream(serializationStream)
	{
		const binaryReader = new DotNetBinaryReader(serializationStream);
	
		// Note: Gets the type of the record at the start of the stream without
		//	advancing the position
		let recordType = binaryReader.view.getUint8();
	
		/** @type {BinaryFormatterData} */
		const data = {};
		
		// eslint-disable-next-line no-constant-condition
		while(true)
		{
			switch (recordType)
			{
				case DotNetBinaryReader.RecordTypeEnumeration.SerializedStreamHeader:
					data.serializedStreamHeader = binaryReader.#readSerializedStreamHeader();
					break;

				case DotNetBinaryReader.RecordTypeEnumeration.ClassWithId:
					throw new Error("Record type not implemented:", recordType);

				case DotNetBinaryReader.RecordTypeEnumeration.SystemClassWithMembers:
					throw new Error("Record type not implemented:", recordType);
				
				case DotNetBinaryReader.RecordTypeEnumeration.ClassWithMembers:
					throw new Error("Record type not implemented:", recordType);

				case DotNetBinaryReader.RecordTypeEnumeration.SystemClassWithMembersAndTypes:
					throw new Error("Record type not implemented:", recordType);

				case DotNetBinaryReader.RecordTypeEnumeration.ClassWithMembersAndTypes:
					data.classWithMembersAndTypes = binaryReader.#readClassWithMembersAndTypes();
					break;

				case DotNetBinaryReader.RecordTypeEnumeration.BinaryObjectString:
					throw new Error("Record type not implemented:", recordType);

				case DotNetBinaryReader.RecordTypeEnumeration.BinaryArray:
					throw new Error("Record type not implemented:", recordType);

				case DotNetBinaryReader.RecordTypeEnumeration.MemberPrimitiveTyped:
					throw new Error("Record type not implemented:", recordType);

				case DotNetBinaryReader.RecordTypeEnumeration.MemberReference:
					throw new Error("Record type not implemented:", recordType);

				case DotNetBinaryReader.RecordTypeEnumeration.ObjectNull:
					throw new Error("Record type not implemented:", recordType);

				case DotNetBinaryReader.RecordTypeEnumeration.MessageEnd:
					return data;

				case DotNetBinaryReader.RecordTypeEnumeration.BinaryLibrary:
					data.binaryLibrary = binaryReader.#readBinaryLibrary();
					break;

				case DotNetBinaryReader.RecordTypeEnumeration.ObjectNullMultiple256:
					throw new Error("Record type not implemented:", recordType);

				case DotNetBinaryReader.RecordTypeEnumeration.ObjectNullMultiple:
					throw new Error("Record type not implemented:", recordType);

				case DotNetBinaryReader.RecordTypeEnumeration.ArraySinglePrimitive:
					throw new Error("Record type not implemented:", recordType);

				case DotNetBinaryReader.RecordTypeEnumeration.ArraySingleObject:
					throw new Error("Record type not implemented:", recordType);

				case DotNetBinaryReader.RecordTypeEnumeration.ArraySingleString:
					throw new Error("Record type not implemented:", recordType);

				case DotNetBinaryReader.RecordTypeEnumeration.MethodCall:
					throw new Error("Record type not implemented:", recordType);

				case DotNetBinaryReader.RecordTypeEnumeration.MethodReturn:
					throw new Error("Record type not implemented:", recordType);

				default:
					throw new TypeError("Invalid record type:", recordType);
			}
		
			recordType = binaryReader.readUInt8();		
		}
	}
	
	/**
	 * Reads a primitive value.
	 * 
	 * @see https://winprotocoldoc.blob.core.windows.net/productionwindowsarchives/MS-NRBF/[MS-NRBF].pdf#%5B%7B%22num%22%3A77%2C%22gen%22%3A0%7D%2C%7B%22name%22%3A%22XYZ%22%7D%2C69%2C625%2C0%5D
	 * @param {Number} type The type of primitive to read.
	 * @returns {Number|String}
	 * @author Loren Goodwin
	 * @author Proddy
	 */
	readPrimitive(type)
	{
		switch (type)
		{
			case DotNetBinaryReader.PrimitiveTypeEnumeration.Boolean:
				return this.readUInt8() != 0;

			case DotNetBinaryReader.PrimitiveTypeEnumeration.Byte:
				return this.readUInt8();

			case DotNetBinaryReader.PrimitiveTypeEnumeration.Char:
				return this.readChar();

			case DotNetBinaryReader.PrimitiveTypeEnumeration.Unused:
				throw new Error("Invalid primitive type:", type);

			case DotNetBinaryReader.PrimitiveTypeEnumeration.Decimal:
				return this.readString();

			case DotNetBinaryReader.PrimitiveTypeEnumeration.Double:
				return this.readFloat64();

			case DotNetBinaryReader.PrimitiveTypeEnumeration.Int16:
				return this.readInt16();
			
			case DotNetBinaryReader.PrimitiveTypeEnumeration.Int32:
				return this.readInt32();

			case DotNetBinaryReader.PrimitiveTypeEnumeration.Int64:
				return this.readInt64();

			
			case DotNetBinaryReader.PrimitiveTypeEnumeration.SByte:
				return this.readInt8();

			case DotNetBinaryReader.PrimitiveTypeEnumeration.Single:
				return this.readFloat32();

			case DotNetBinaryReader.PrimitiveTypeEnumeration.TimeSpan:
			case DotNetBinaryReader.PrimitiveTypeEnumeration.DateTime:
				return this.readInt64();

			case DotNetBinaryReader.PrimitiveTypeEnumeration.UInt16:
				return this.readUInt16();

			case DotNetBinaryReader.PrimitiveTypeEnumeration.UInt32:
				return this.readUInt32();

			case DotNetBinaryReader.PrimitiveTypeEnumeration.UInt64:
				return this.readUInt64();

			// TODO: implement this
			case DotNetBinaryReader.PrimitiveTypeEnumeration.Null:
				throw new Error("Unimplemented primitive type:", type);

			case DotNetBinaryReader.PrimitiveTypeEnumeration.String:
				return this.readString();

			default:
				throw new Error("Invalid primitive type:", type);
		}
	}

	/**
	 * Reads the serialization header.
	 * 
	 * @returns {SerializedStreamHeader}
	 * @author Loren Goodwin
	 * @author Proddy
	 */
	#readSerializedStreamHeader()
	{
		/** @type {SerializedStreamHeader} */
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
	 * @author Loren Goodwin
	 * @author Proddy
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
	 * @returns {ClassWithMembersAndTypes}
	 * @author Loren Goodwin
	 * @author Proddy
	 */
	#readClassWithMembersAndTypes()
	{
		/** @type {ClassWithMembersAndTypes} */
		const serializedClass = 
		{
			objectId: this.readUInt32(),
			name: this.readString(),
			memberCount: this.readUInt32(),
		};

		// Read Member Names
		serializedClass.memberNames = this.#readClassWithMembersAndTypesMemberNames(serializedClass.memberCount);

		// Read Member Types
		serializedClass.memberTypes = this.#readClassWithMembersAndTypesMemberTypes(serializedClass.memberCount);

		// Read Library ID
		// 	NOTE: If this isn't 2, the file is fucked
		//	Should probably do error handling here
		//	Josh said this is an identifier that explains how to read the rest of the file
		serializedClass.libraryId = this.readUInt32();

		// Read Member Values
		serializedClass.memberValues = this.#readClassWithMembersAndTypesMemberValues(serializedClass.memberCount, serializedClass.memberTypes);

		return serializedClass;
	} 

	/**
	 * Reads the serialized class' member names.
	 * 
	 * @param {Number} memberCount
	 * @returns {Array<String>}
	 * @author Loren Goodwin
	 * @author Proddy
	 */
	#readClassWithMembersAndTypesMemberNames(memberCount)
	{
		const memberNames = [];

		for(let i = 0; i < memberCount; i++)
		{
			memberNames.push(this.readString());
		}

		return memberNames;
	}

	/**
	 * Reads the serialized class' member types.
	 * 
	 * @param {Number} memberCount 
	 * @returns {Array<SerializedClassMemberType>}
	 * @author Loren Goodwin
	 * @author Proddy
	 */
	#readClassWithMembersAndTypesMemberTypes(memberCount)
	{
		const memberTypes = [];

		for(let i = 0; i < memberCount; i++)
		{
			/** @type {SerializedClassMemberType} */
			const type =
			{
				id: this.readUInt8(),
				additionalInfo: undefined,
			};

			memberTypes.push(type);
		}

		for (let i = 0; i < memberCount; i++)
		{
			/** @type {SerializedClassMemberType} */
			const type = memberTypes[i];

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

		return memberTypes;
	}

	/**
	 * Reads the serialized class' member values.
	 * 
	 * @param {Number} memberCount 
	 * @param {Array<SerializedClassMemberType>} memberTypes 
	 * @returns {Array<SerializedClassMemberValue>}
	 * @author Loren Goodwin
	 * @author Proddy
	 */
	#readClassWithMembersAndTypesMemberValues(memberCount, memberTypes)
	{
		const memberValues = [];

		// Read Member Values
		for(let i = 0; i < memberCount; i++)
		{
			const type = memberTypes[i];

			const value = {};

			switch (type.id)
			{
				case DotNetBinaryReader.BinaryTypeEnumeration.Primitive: 
					value.value = this.readPrimitive(type.additionalInfo);	
					break;

				case DotNetBinaryReader.BinaryTypeEnumeration.String:
					// TODO: Look into this, this code seems wrong...
					//	See: https://winprotocoldoc.blob.core.windows.net/productionwindowsarchives/MS-NRBF/[MS-NRBF].pdf#%5B%7B%22num%22%3A66%2C%22gen%22%3A0%7D%2C%7B%22name%22%3A%22XYZ%22%7D%2C69%2C670%2C0%5D
					value.recordType = this.readUInt8();

					if (value.recordType != 6)
					{
						throw new Error("Unknown string record type:", value.recordType);
					}

					value.objectId = this.readUInt32();

					value.value = this.readString();

					break;

				case DotNetBinaryReader.BinaryTypeEnumeration.Object:
					throw new Error("Object not implemented.");

				case DotNetBinaryReader.BinaryTypeEnumeration.SystemClass:
					throw new Error("SystemClass not implemented.");

				case DotNetBinaryReader.BinaryTypeEnumeration.Class:
					throw new Error("Class not implemented.");

				case DotNetBinaryReader.BinaryTypeEnumeration.ObjectArray:
					throw new Error("ObjectArray not implemented.");

				case DotNetBinaryReader.BinaryTypeEnumeration.StringArray:
					throw new Error("StringArray not implemented.");

				case DotNetBinaryReader.BinaryTypeEnumeration.PrimitiveArray:
					value.recordType = this.readUInt8();
					value.index = this.readUInt32();

					break;

				default:
					throw new Error("Invalid member type:", type.id);
			}

			memberValues.push(value);
		}

		// Read Array Member Values
		for(let i = 0; i < memberCount; i++)
		{
			const type = memberTypes[i];

			if (type.id != 7)
			{
				continue;
			}

			const value = memberValues[i];

			// Note: Skip over padding
			do
			{
				value.recordType = this.readUInt8();
			}
			while(value.recordType == 0);

			value.id = this.readUInt32();

			value.length = this.readUInt32();

			value.primitiveType = this.readUInt8();

			value.value = [];

			for(let i = 0; i < value.length; i++)
			{
				value.value.push(this.readPrimitive(value.primitiveType));
			}
		}

		return memberValues;
	}
}
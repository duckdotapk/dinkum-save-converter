//
// Exports
//

/**
 * A class for reading binary files.
 */
export class BinaryReader
{
	/**
	 * @type {Number}
	 */
	position = 1;

	/** 
	 * @type {DataView} 
	 */
	view;

	/**
	 * Constructs a new BinaryReader.
	 * 
	 * @param {ArrayBuffer} arrayBuffer 
	 */
	constructor(arrayBuffer)
	{
		this.view = new DataView(arrayBuffer);
	}

	/**
	 * Reads a string's length from the file and then the string itself.
	 * 
	 * @returns {String}
	 */
	readString() 
	{
		let length = this.view.getUint8(this.position);

		this.position += 1;

		let buffer = [];

		for (let i = 0; i < length; i++) 
		{
			buffer.push(this.view.getUint8(this.position));

			this.position += 1;
		}
	
		return String.fromCharCode.apply(String, buffer);
	}

	/**
	 * Reads an unsigned 8-bit integer from the file.
	 * 
	 * @returns {Number}
	 */
	readUInt8()
	{
		const int = this.view.getUint8(this.position);

		this.position += 1;

		return int;
	}

	/**
	 * Reads an unsigned 32-bit integer from the file.
	 * 
	 * @returns {Number}
	 */
	readUInt32()
	{
		const int = this.view.getUint32(this.position, true);

		this.position += 4;

		return int;
	}
}
# Dinkum Save Converter
This is a command line tool for converting saved games for the game [Dinkum](https://store.steampowered.com/app/1062520/Dinkum/) to and from JSON.

## Usage
Install [Node.js](https://nodejs.org/en/) 18.0.0 or later. It may work in earlier versions, too, but I didn't try it so your mileage may vary.

Once you've done that, run the script as follows:

```
cd ./dinkum-save-converter/src

node .
```

It defaults to reading `Slot0` out of your Dinkum save directory but you can also pass a path as a command line argument:

```
node . "C:\\Users\\Loren\\Desktop\\Slot0"
```

A `_JSON_DUMP` folder will be created in the save directory.

This tool should work on Windows and Linux.

## Status
Currently, you can **only partially dump** your save data. The tool is only capable of dumping the following 5 dat files for now:

- `date.dat`
- `levels.dat`
- `mapIcons.dat`
- `playerInfo.dat`
- `townStatus.dat`

## Special Thanks
My good friend, [Proddy](https://github.com/Hampo), has been a tremendous help with this project so far and I'd like to thank him here for his assistance.

## License
[MIT](https://github.com/duckdotapk/dinkum-save-converter/blob/main/LICENSE.md)
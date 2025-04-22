import { makeComponentName, readdirAndSort } from "./utils";

export async function anytoexport(extensions: string[]) {
  const DIRECTORY = process.argv[3] || ".";
  const OUTPUT_FILE = process.argv[4] || "index.ts";

  let files = await readdirAndSort(DIRECTORY, extensions);

  const componentNames = files.map((file) => {
    const [filename] = file.split(".");
    return makeComponentName(filename);
  });

  const usedNames = new Set<string>();

  let output = "";

  files.forEach((file, i) => {
    let fileName = file;
    if (fileName.includes(".tsx")) {
      fileName = fileName.split(".")[0];
    }
    let exportName = componentNames[i];
    if (usedNames.has(exportName)) {
      exportName += "Icon";
    }
    usedNames.add(exportName);
    let line = `export { default as ${exportName} } from "./${fileName}";\n`;
    output += line; 
  });

  const sortedOutput = output
    .trim()
    .split("\n")
    .sort((a, b) => {
      const lengthDiff = a.length - b.length;
      if (lengthDiff !== 0) return lengthDiff;
      return a.localeCompare(b);
    })
    .join("\n") + "\n";

  const path = `${DIRECTORY}/${OUTPUT_FILE}`;
  await Bun.write(path, sortedOutput);
  console.write("anytoexport - Done! \n");
}
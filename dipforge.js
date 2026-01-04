/**
 * dipForge – DipTrace Component Generator
 * - Fetches component data from suppliers (LCSC) and generates DipTrace library files
 * - Keeps app open for multiple component generations
 * - Adds menu system for repeat operations
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Detect if running as pkg executable
const isPkg = typeof process.pkg !== 'undefined';

// Base directory:
// - in pkg: directory of the .exe
// - in node: script folder
const baseDir = isPkg ? path.dirname(process.execPath) : __dirname;

const footprintsFile = path.join(baseDir, 'footprints.xml');
const logPath = path.join(baseDir, 'dipforge_log.txt');

// ------------------ Logging ------------------
let logMessage = '=== dipForge Run Start ===\n';
logMessage += `Date: ${new Date().toISOString()}\n`;
logMessage += `isPkg: ${isPkg}\n`;
logMessage += `baseDir: ${baseDir}\n`;
logMessage += `footprintsFile: ${footprintsFile}\n`;
logMessage += `execPath: ${process.execPath}\n`;

function log(line) {
  const msg = String(line);
  console.log(msg);
  logMessage += msg + '\n';
  try {
    fs.appendFileSync(logPath, msg + '\n', 'utf-8');
  } catch {
    // ignore logging failures (permissions, etc.)
  }
}

// Start log file
try {
  fs.appendFileSync(logPath, logMessage, 'utf-8');
} catch {
  // ignore
}

// ------------------ ASCII Banner ------------------
function showBanner() {
  console.log('\n');
  console.log('  ██████╗ ██╗██████╗ ███████╗ ██████╗ ██████╗  ██████╗ ███████╗');
  console.log('  ██╔══██╗██║██╔══██╗██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝');
  console.log('  ██║  ██║██║██████╔╝█████╗  ██║   ██║██████╔╝██║  ███╗█████╗  ');
  console.log('  ██║  ██║██║██╔═══╝ ██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝  ');
  console.log('  ██████╔╝██║██║     ██║     ╚██████╔╝██║  ██║╚██████╔╝███████╗');
  console.log('  ╚═════╝ ╚═╝╚═╝     ╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝');
  console.log('');
  console.log('                    DipTrace Component Generator');
  console.log('                      Forge your components with ease');
  console.log('');
}

log('dipForge started');

// ------------------ Helpers ------------------
function xmlEscape(v) {
  if (v === null || v === undefined) return '';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Better refdes: look at both category + package + name
function getRefDes(partInfo) {
  const key = [
    partInfo.Category,
    partInfo.Package,
    partInfo.PartName,
    partInfo.Description
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (/\bresistor\b|\bresistors\b/.test(key)) return 'R';
  if (/\bcapacitor\b|\bcapacitors\b|\bcap\b/.test(key)) return 'C';
  if (/\binductor\b|\binductors\b|\bcoil\b/.test(key)) return 'L';
  if (/\bdiode\b|\bdiodes\b/.test(key)) return 'D';
  if (/\btransistor\b|\btransistors\b|\bmosfet\b|\bbjt\b/.test(key)) return 'Q';
  if (/\bic\b|\bintegrated circuit\b|\bmcu\b|\bprocessor\b|\bop-amp\b|\bregulator\b/.test(key)) return 'U';

  return 'U';
}

function setFootprint(type, pkg) {
  const normalizedType = (type || '').toLowerCase();
  const normalizedPackage = (pkg || '').toString().trim();

  const footprintMap = {
    "0201": { resistor: "PatType0", resistors: "PatType0", capacitor: "PatType1", capacitors: "PatType1" },
    "0402": { resistor: "PatType3", resistors: "PatType3", capacitor: "PatType1", capacitors: "PatType1" },
    "0603": { resistor: "PatType6", resistors: "PatType6", capacitor: "PatType1", capacitors: "PatType1" },
    "0805": { resistor: "PatType9", resistors: "PatType9", capacitor: "PatType1", capacitors: "PatType1" },
    "1206": { resistor: "PatType12", resistors: "PatType12", capacitor: "PatType1", capacitors: "PatType1" }
  };

  const packageMap = footprintMap[normalizedPackage];
  if (packageMap && packageMap[normalizedType]) {
    return packageMap[normalizedType];
  }

  log(`WARN: No footprint mapping found for type="${type}" package="${pkg}" -> default PatType0`);
  return "PatType0";
}

function setSymbol(type) {
  const normalizedType = (type || '').toLowerCase();

  switch (normalizedType) {
    case 'resistor':
    case 'resistors':
      return `<Pins>
            <Pin Id="0" X="3.81" Y="0" Locked="N" Type="Default" ElectricType="Passive" Orientation="180" PadId="2" Length="3.81" ShowName="N">
              <Name>2</Name>
              <PadNumber>2</PadNumber>
            </Pin>
            <Pin Id="1" X="-3.81" Y="0" Locked="N" Type="Default" ElectricType="Passive" Orientation="0" PadId="1" Length="3.81" ShowName="N">
              <Name>1</Name>
              <PadNumber>1</PadNumber>
            </Pin>
          </Pins>

          <Shapes>
            <Shape Id="0" Type="Line" LineWidth="0.25" Locked="N">
              <Points><Point X="3.175" Y="-1.27"/><Point X="3.81" Y="0"/></Points>
            </Shape>
            <Shape Id="1" Type="Line" LineWidth="0.25" Locked="N">
              <Points><Point X="1.905" Y="1.27"/><Point X="3.175" Y="-1.27"/></Points>
            </Shape>
            <Shape Id="2" Type="Line" LineWidth="0.25" Locked="N">
              <Points><Point X="0.635" Y="-1.27"/><Point X="1.905" Y="1.27"/></Points>
            </Shape>
            <Shape Id="3" Type="Line" LineWidth="0.25" Locked="N">
              <Points><Point X="-0.635" Y="1.27"/><Point X="0.635" Y="-1.27"/></Points>
            </Shape>
            <Shape Id="4" Type="Line" LineWidth="0.25" Locked="N">
              <Points><Point X="-1.905" Y="-1.27"/><Point X="-0.635" Y="1.27"/></Points>
            </Shape>
            <Shape Id="5" Type="Line" LineWidth="0.25" Locked="N">
              <Points><Point X="-3.175" Y="1.27"/><Point X="-1.905" Y="-1.27"/></Points>
            </Shape>
            <Shape Id="6" Type="Line" LineWidth="0.25" Locked="N">
              <Points><Point X="-3.81" Y="0"/><Point X="-3.175" Y="1.27"/></Points>
            </Shape>
          </Shapes>`;
    case 'capacitor':
    case 'capacitors':
      return `<Pins>
  <Pin Id="4" X="-1.27" Y="0" Locked="N" Type="Default" ElectricType="Passive" Orientation="0" PadId="1" Length="3.81" ShowName="N" NumXShift="0" NumYShift="0" NameXShift="0" NameYShift="0" SignalDelay="0" NumOrientation="0" NameOrientation="0">
  <Name>1</Name>
  <PadNumber>1</PadNumber>
  <NameFont Size="5" Width="-2" Scale="1"/>
  </Pin>
  <Pin Id="5" X="1.27" Y="0" Locked="N" Type="Default" ElectricType="Passive" Orientation="180" PadId="-1" Length="3.81" ShowName="N" NumXShift="0" NumYShift="0" NameXShift="0" NameYShift="0" SignalDelay="0" NumOrientation="0" NameOrientation="0">
  <Name>2</Name>
  <PadNumber>2</PadNumber>
  <NameFont Size="5" Width="-2" Scale="1"/>
  </Pin>
  </Pins>
  <Shapes>
  <Shape Id="0" Type="Line" LineWidth="0.25" Locked="N">
  <Points>
  <Point X="-0.3175" Y="-1.905"/>
  <Point X="-0.3175" Y="1.905"/>
  </Points>
  </Shape>
  <Shape Id="1" Type="Line" LineWidth="0.25" Locked="N">
  <Points>
  <Point X="0.3175" Y="-1.905"/>
  <Point X="0.3175" Y="1.905"/>
  </Points>
  </Shape>
  <Shape Id="12" Type="Line" LineWidth="0.25" Locked="N">
  <Points>
  <Point X="0.3178" Y="0"/>
  <Point X="1.27" Y="0"/>
  </Points>
  </Shape>
  <Shape Id="13" Type="Line" LineWidth="0.25" Locked="N">
  <Points>
  <Point X="-1.27" Y="0"/>
  <Point X="-0.3172" Y="0"/>
  </Points>
  </Shape>
  </Shapes>`;
    case 'inductor':
    case 'inductors':
      return 'Inductor';
    case 'diode':
    case 'diodes':
      return 'Diode';
    case 'transistor':
    case 'transistors':
      return 'Transistor';
    case 'ic':
    case 'integrated circuit':
      return 'IC';
    default:
      break;
  }
}

// Extract only <Patterns>...</Patterns> from a footprints library (avoids nested <Library>)
function extractPatternsBlock(xml) {
  const cleaned = xml.replace(/<\?xml[^?]*\?>\s*/g, '');
  const match = cleaned.match(/<Patterns\b[\s\S]*?<\/Patterns>/i);
  if (match) return match[0];

  // If file is already a fragment (no <Library> wrapper) we accept it as-is
  // but warn because DipTrace usually expects <Patterns> section.
  log('WARN: No <Patterns>...</Patterns> block found in footprints.xml, inserting full contents as-is.');
  return cleaned;
}

// ------------------ Main XML generator ------------------
async function generateLibPart(partInfo, xmlPath) {
  try {
    // Check footprints file exists
    if (!fs.existsSync(footprintsFile)) {
      throw new Error(`Footprints file not found at: ${footprintsFile}`);
    }

    const footprintsXML = fs.readFileSync(footprintsFile, 'utf-8');
    const patternsBlock = extractPatternsBlock(footprintsXML);

    const patternStyle = setFootprint(partInfo.Category, partInfo.Package);

    // NOTE: DipTrace XML expects proper escaping
    const completeXML = `<?xml version="1.0" encoding="utf-8"?>
<Library Type="DipTrace-ComponentLibrary" Name="dipForge Generated Components" Hint="Generated by dipForge" Version="5.2.0.4" Units="mm">
${patternsBlock}
  <Components>
    <Component>
      <Part RefDes="${xmlEscape(getRefDes(partInfo))}" PartType="Normal" ShowNumbers="Hide" Type="Free" Width="7.62" Height="2.54" LockTypeChange="N">
        <Name>${xmlEscape(partInfo.PartName)} (dipForge)</Name>
        <Value>${xmlEscape(partInfo.MainValue)}</Value>
        <Origin X="0" Y="0"/>
        <Manufacturer>${xmlEscape(partInfo.Manufacturer)}</Manufacturer>
        <Datasheet>${xmlEscape(partInfo.DatasheetURL)}</Datasheet>
      ${setSymbol(partInfo.Category)}

        <AddFields>
          <AddField Type="Text">
            <Name>Part Number (${xmlEscape(partInfo.Supplier)})</Name>
            <Text>${xmlEscape(partInfo.PartNo)}</Text>
          </AddField>
          <AddField Type="Text">
            <Name>Manufacturer</Name>
            <Text>${xmlEscape(partInfo.Manufacturer)}</Text>
          </AddField>
          <AddField Type="Text">
            <Name>Description</Name>
            <Text>${xmlEscape(partInfo.Description)}</Text>
          </AddField>
          <AddField Type="Text">
            <Name>Package</Name>
            <Text>${xmlEscape(partInfo.Package)}</Text>
          </AddField>
          <AddField Type="Text">
            <Name>Generated By</Name>
            <Text>dipForge v1.0</Text>
          </AddField>
        </AddFields>

<Pattern Style="PatType1"/>

      </Part>
    </Component>
  </Components>
</Library>`;

    fs.writeFileSync(xmlPath, completeXML, 'utf-8');
    log('✓ XML written successfully (with imported patterns)');

  } catch (err) {
    log(`ERROR: ${err.message}`);
    throw err;
  }
}

// ------------------ CLI prompts ------------------
function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    })
  );
}

async function chooseSupplier() {
  const suppliers = ['LCSC'];
  console.log('\n Select supplier:');
  suppliers.forEach((s, i) => console.log(` ${i + 1}) ${s}`));

  while (true) {
    const choice = await ask('Enter number: ');
    const idx = Number(choice) - 1;
    if (idx >= 0 && idx < suppliers.length) return suppliers[idx];
  }
}

async function askPartNumber() {
  while (true) {
    const pn = await ask('Enter supplier part number: ');
    if (pn.length > 0) return pn;
  }
}

// ------------------ LCSC fetch ------------------
async function getPartData(supplier, partNumber) {
  try {
    if (supplier === 'LCSC') {
      const url = `https://wmsc.lcsc.com/ftps/wm/product/detail?productCode=${encodeURIComponent(partNumber)}`;

      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'dipForge/1.0',
          'Accept': 'application/json'
        }
      });

      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      return await res.json();
    }

    log(`API not implemented for ${supplier}`);
    return null;
  } catch (error) {
    log(`Error fetching data: ${error.message}`);
    return null;
  }
}

function extractPartInfo(rawData, supplier, partNumber) {
  if (!rawData || !rawData.result) return null;

  const result = rawData.result;

  const partInfo = {
    PartNo: partNumber,
    PartName: result.productModel || '',
    Description: result.productNameEn || result.productIntroEn || '',
    Manufacturer: result.brandNameEn || '',
    Category: result.parentCatalogName || '',
    Package: result.encapStandard || '',
    DatasheetURL: result.pdfUrl || '',
    Supplier: supplier,
    SupplierPartNo: result.productCode || partNumber,
    Parameters: {},
    MainValue: ''
  };

  if (Array.isArray(result.paramVOList)) {
    result.paramVOList.forEach(param => {
      const key = param.paramNameEn || param.paramName;
      const value = param.paramValueEn || param.paramValue;
      const paramCode = param.paramCode;

      if (key && value) {
        partInfo.Parameters[key] = value;

        // main value extraction (examples)
        if (paramCode === 'param_10951_n') partInfo.MainValue = value; // Capacitance
        if (paramCode === 'param_11205_n') partInfo.MainValue = value; // Resistance
      }
    });
  }

  return partInfo;
}

// ------------------ Single component generation ------------------
async function generateSingleComponent() {
  try {
    const answers = {
      supplier: await chooseSupplier(),
      partNumber: await askPartNumber(),
    };

    console.log('\n Collected data:');
    console.log(answers);

    console.log('\n Fetching part data...');
    const rawData = await getPartData(answers.supplier, answers.partNumber);

    if (!rawData) {
      log('No data returned from API');
      return false;
    }

    const partInfo = extractPartInfo(rawData, answers.supplier, answers.partNumber);
    if (!partInfo) {
      log('Failed to extract part information');
      return false;
    }

    console.log('\n=== Extracted Part Information ===');
    console.log(`Part No: ${partInfo.PartNo}`);
    console.log(`Part Name: ${partInfo.PartName}`);
    console.log(`Description: ${partInfo.Description}`);
    console.log(`Category: ${partInfo.Category}`);
    console.log(`Manufacturer: ${partInfo.Manufacturer}`);
    console.log(`Package: ${partInfo.Package}`);
    console.log(`Datasheet: ${partInfo.DatasheetURL}`);

    // Use provided XML path or generate a default one
    let xmlPath;
    if (process.argv.length >= 3) {
      xmlPath = process.argv[2];
    } else {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      xmlPath = path.join(baseDir, `dipforge_component_${timestamp}.xml`);
      log(`No XML path provided, using: ${xmlPath}`);
    }

    await generateLibPart(partInfo, xmlPath);
    console.log(`\n Component forged successfully at: ${xmlPath}`);
    return true;

  } catch (err) {
    log(`ERROR in component generation: ${err.message}`);
    return false;
  }
}

// ------------------ Main menu loop ------------------
async function showMainMenu() {
  console.log('\n' + '═'.repeat(60));
  console.log('FORGE MENU');
  console.log('═'.repeat(60));
  console.log('1) Forge new component');
  console.log('2) Exit dipForge');
  console.log('═'.repeat(60));
  
  const choice = await ask('Enter your choice (1-2): ');
  return choice.trim();
}

// ------------------ Run with menu loop ------------------
(async () => {
  showBanner();
  console.log('Welcome to dipForge - Your DipTrace component creation companion!');
  console.log('Transform supplier part numbers into ready-to-use DipTrace components.');
  
  while (true) {
    try {
      const choice = await showMainMenu();
      
      switch (choice) {
        case '1':
          console.log('\n --- Starting Component Forge Process ---');
          const success = await generateSingleComponent();
          if (success) {
            console.log('\n Component successfully forged and ready for use!');
          } else {
            console.log('\n Forge process failed. Check dipforge_log.txt for details.');
          }
          break;
          
        case '2':
          console.log('\n Thanks for using dipForge! Happy designing!');
          process.exit(0);
          break;
          
        default:
          console.log('\n  Invalid choice. Please enter 1 or 2.');
          break;
      }
      
      // Small pause before showing menu again
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (err) {
      log(`FATAL: ${err.message || err}`);
      console.log('\n An error occurred. Check the dipforge_log.txt file for details.');
      
      const continueChoice = await ask('Do you want to continue? (y/n): ');
      if (continueChoice.toLowerCase() !== 'y') {
        break;
      }
    }
  }
})();
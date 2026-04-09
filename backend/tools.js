const { exec } = require('child_process');
const util = require('util');
const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const execPromise = util.promisify(exec);
const { Builder, By, Key, until } = require('selenium-webdriver');
const edge = require('selenium-webdriver/edge');
const chrome = require('selenium-webdriver/chrome');
const { searchManual } = require('./rag_processor');

// Security helper: Sanitize shell inputs to prevent command injection
function sanitizeShell(input) {
  if (typeof input !== 'string') return '';
  // Remove common shell metacharacters
  return input.replace(/[;&|`$><!(){}\[\]]/g, '').trim();
}

// ── Selenium Driver Management ──
let driverInstance = null;

async function getDriver() {
  if (driverInstance) return driverInstance;
  
  const edgeOpts = new edge.Options();
  edgeOpts.addArguments('--start-maximized', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--remote-debugging-port=9222');
  
  const chromeOpts = new chrome.Options();
  chromeOpts.addArguments('--start-maximized', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--remote-debugging-port=9222');

  // Try Edge first (common on Windows), then Chrome
  try {
    driverInstance = await new Builder()
      .forBrowser('edge')
      .setEdgeOptions(edgeOpts)
      .build();
  } catch (e) {
    try {
      driverInstance = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(chromeOpts)
        .build();
    } catch (e2) {
      // LAST RESORT: Try headless
      try {
        console.warn("Retrying in Headless Mode...");
        chromeOpts.addArguments('--headless=new');
        driverInstance = await new Builder()
          .forBrowser('chrome')
          .setChromeOptions(chromeOpts)
          .build();
      } catch (e3) {
        throw new Error(`Could not initialize Selenium driver: ${e3.message}`);
      }
    }
  }
  return driverInstance;
}

// ── JSON Schemas for Groq ──
const groqTools = [
  {
    type: "function",
    function: {
      name: "open_url",
      description: "MANDATORY for opening any website or URL in the default browser. Use this whenever the user says 'open', 'go to', or 'show me' a website.",
      parameters: {
        type: "object",
        properties: {
          urls: {
            type: "array",
            items: { type: "string" },
            description: "A list of URLs to open."
          }
        },
        required: ["urls"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "open_application",
      description: "Opens a native Windows application or executable by its name (e.g., 'calc', 'notepad', 'capcut', 'chrome').",
      parameters: {
        type: "object",
        properties: {
          app_name: {
            type: "string",
            description: "The name of the application to open."
          }
        },
        required: ["app_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "close_active_tabs",
      description: "Closes a specific number of tabs in the currently active Chrome/Edge browser window by simulating Ctrl+W.",
      parameters: {
        type: "object",
        properties: {
          count: {
            type: "integer",
            description: "The number of browser tabs to close. Defaults to 1."
          }
        },
        required: ["count"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "close_application",
      description: "Forcefully closes a running native application processes by name (e.g., 'chrome', 'calculator'). Do NOT use this for closing a single tab, use close_active_tabs instead.",
      parameters: {
        type: "object",
        properties: {
          app_name: {
            type: "string",
            description: "The name of the application to close process (without .exe)."
          }
        },
        required: ["app_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_folder_count",
      description: "Returns the number of subfolders in a specific known Windows directory like 'Desktop', 'Documents', or 'Downloads'.",
      parameters: {
        type: "object",
        properties: {
          directory: {
            type: "string",
            enum: ["Desktop", "Documents", "Downloads", "Pictures", "Music"],
            description: "The standard Windows directory to count folders in."
          }
        },
        required: ["directory"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "open_folder",
      description: "Opens a specific folder in Windows File Explorer.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "The name or path of the folder to open (e.g., 'Desktop', 'Documents', or a full path)."
          }
        },
        required: ["path"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_files",
      description: "Lists files and folders inside a specific Windows directory.",
      parameters: {
        type: "object",
        properties: {
          directory: {
            type: "string",
            enum: ["Desktop", "Documents", "Downloads", "Pictures", "Music"],
            description: "The standard Windows directory to list items from."
          }
        },
        required: ["directory"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_desktop_items",
      description: "Returns a list of all files, folders, and shortcuts currently visible on the user's desktop. Useful for 'seeing' what is available to open.",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_system",
      description: "Searches the entire system for a file, folder, or application using the Windows Search Index. Returns paths to the best matches.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The name or part of the name of the file, folder, or application to search for."
          },
          search_type: {
            type: "string",
            enum: ["all", "app", "file", "folder"],
            description: "Filter search results by type. Defaults to 'all'."
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "open_file",
      description: "Opens a file using its default Windows application (e.g., .pdf, .docx, .txt, .jpg). Use this when the user asks to 'open' or 'view' a specific file found via search.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "The full absolute path to the file to open."
          }
        },
        required: ["path"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "analyze_image",
      description: "Analyzes an image file (evidence photo) to describe its contents, identifying objects, text, or suspicious elements.",
      parameters: {
        type: "object",
        properties: {
          image_path: {
            type: "string",
            description: "The full path to the image file to analyze."
          },
          prompt: {
            type: "string",
            description: "A specific question or instruction for the analysis (e.g., 'What is written on this paper?')."
          }
        },
        required: ["image_path"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "generate_report",
      description: "Generates a formal investigator report based on provided details.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "The title of the report." },
          content: { type: "string", description: "The main body/findings of the report." },
          filename: { type: "string", description: "Desired filename (e.g., 'case_001_report.txt')." }
        },
        required: ["title", "content", "filename"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "schedule_task",
      description: "Schedules a task, interview, or deadline.",
      parameters: {
        type: "object",
        properties: {
          task: { type: "string", description: "Description of the task." },
          date: { type: "string", description: "Date and time for the task." }
        },
        required: ["task", "date"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "selenium_web_automation",
      description: "MANDATORY for checking real-time info like followers, news, or performing multi-step actions on websites. Use this to search on Google/YouTube/Instagram, click elements, or type into fields. DO NOT HALLUCINATE data, use this tool to verify.",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["navigate", "search", "click", "type", "get_text", "scroll_up", "scroll_down", "capture_page", "close"],
            description: "The automation action to perform."
          },
          target: {
            type: "string",
            description: "The URL, search query, or CSS selector/Element ID depending on the action."
          },
          value: {
            type: "string",
            description: "Text to type OR scroll amount (e.g., '500')."
          },
          platform: {
            type: "string",
            enum: ["google", "youtube", "generic"],
            description: "Optional platform context for specialized searching."
          }
        },
        required: ["action", "target"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "capture_desktop",
      description: "Takes a screenshot of the entire Windows desktop to see what the user is looking at outside the browser.",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "ask_cybercrime",
      description: "MANDATORY tool for ANY question about cyber crime, online fraud, digital evidence, cyber investigation, IT Act, phishing, hacking, malware, ransomware, social media crime, bank fraud, UPI fraud, OTP scam, identity theft, cyberstalking, CDR/IPDR analysis, digital forensics, FIR for cyber crime, evidence preservation, or any police investigation related to computers/internet/mobile phones. Always use this tool when the query is related to cyber crime or digital investigation.",
      parameters: {
        type: "object",
        properties: {
          question: {
            type: "string",
            description: "The cyber crime or investigation related question to look up in the knowledge base."
          }
        },
        required: ["question"]
      }
    }
  }
];

// ── Execution Engines ──
async function executeTool(name, args) {
  console.log(`\n[JARVIS] >>> EXEC_TOOL: ${name} | ARGS:`, JSON.stringify(args));
  try {
    switch (name) {
      case 'open_url':
        if (process.platform !== 'win32') return "URL opening is only supported in desktop mode (Windows).";
        let opened = [];
        console.log(`[JARVIS] Opening URL(s):`, args.urls);
        for (const url of args.urls) {
          const sanitizedUrl = url.replace(/[\"']/g, ''); // Basic URL cleaning
          const safeUrl = sanitizedUrl.startsWith('http') ? sanitizedUrl : `https://${sanitizedUrl}`;
          // V7.7.2: Hybrid approach for maximum reliability on Windows
          try {
            console.log(`[JARVIS] Shell Execute: ${safeUrl}`);
            await execPromise(`cmd /c start "" "${safeUrl}"`);
          } catch (e) {
            console.warn(`[JARVIS] CMD fallback failed, trying PowerShell: ${e.message}`);
            await execPromise(`powershell.exe -NoProfile -Command "Start-Process '${safeUrl}'"`).catch((pe) => {
               console.error(`[JARVIS] ALL URL OPEN ATTEMPTS FAILED: ${pe.message}`);
            });
          }
          opened.push(safeUrl);
        }
        return `Successfully opened: ${opened.join(', ')}`;

      case 'open_application':
        if (process.platform !== 'win32') return "Application launching is only supported in desktop mode (Windows).";
        const appName = sanitizeShell(args.app_name);
        try {
          // Attempt 1: Direct start
          await execPromise(`start \"\" \"${appName}\"`);
          return `Successfully launched ${appName}.`;
        } catch (e1) {
          try {
            // Attempt 2: Use search_system to find the app
            const searchResult = await executeTool('search_system', { query: appName, search_type: 'app' });
            if (searchResult.startsWith('Found')) {
              const lines = searchResult.split('\n');
              const firstMatch = lines.find(l => l.includes('Path:'))?.split('Path: ')[1];
              if (firstMatch) {
                await execPromise(`start "" "${firstMatch}"`);
                return `Successfully launched ${args.app_name} from ${firstMatch}.`;
              }
            }

            // Attempt 3: Legacy Search Desktop and Start Menu (as secondary fallback)
            const psSearch = `
              $name = "${args.app_name}".ToLower().Trim();
              $searchPaths = @(
                [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop),
                [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::CommonDesktopDirectory),
                [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::StartMenu),
                [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::CommonStartMenu),
                "C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs",
                "C:\\Users\\$env:USERNAME\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs"
              );
              foreach ($path in $searchPaths) {
                if (Test-Path $path) {
                  $file = Get-ChildItem -Path $path -Recurse -ErrorAction SilentlyContinue | Where-Object { 
                    ($_.Name.ToLower().Contains($name)) -and ($_.Extension -eq ".lnk" -or $_.Extension -eq ".exe")
                  } | Select-Object -First 1;
                  if ($file) {
                    Start-Process $file.FullName;
                    return "Launched $($file.Name)"
                  }
                }
              };
              Write-Error "Not found in shortcuts."
            `;
            const { stdout: searchOut } = await execPromise(`C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe -NoProfile -Command "${psSearch.replace(/\n/g, ' ')}"`);
            if (searchOut.includes('Launched')) return searchOut.trim();
            
            // Attempt 4: Get-StartApps (UWP)
            const psStartApps = `
              $apps = Get-StartApps | Where-Object { $_.Name.ToLower().Contains("${args.app_name}".ToLower()) };
              if ($apps.Length -gt 0) {
                 Start-Process "explorer.exe" "shell:appsFolder\\$($apps[0].AppID)";
                 return "Launched $($apps[0].Name)"
              };
              Write-Error "App not found."
            `;
            const { stdout: appsOut } = await execPromise(`C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe -NoProfile -Command "${psStartApps.replace(/\n/g, ' ')}"`);
            if (appsOut.includes('Launched')) return appsOut.trim();

            throw new Error('All attempts failed');
          } catch (e2) {
            return `Failed to open ${args.app_name}. I checked the system search index, shortcuts, the Desktop, and your Start Menu, but could not locate it.`;
          }
        }

      case 'close_application':
        if (process.platform !== 'win32') return "Application closing is only supported in desktop mode (Windows).";
        const closeApp = sanitizeShell(args.app_name);
        await execPromise(`taskkill /IM "${closeApp}.exe" /F /T`).catch(() => {});
        // Also try without forcing .exe if it already had it
        await execPromise(`taskkill /IM "${closeApp}" /F /T`).catch(() => {});
        return `Successfully sent termination signal to ${closeApp}.`;

        if (process.platform !== 'win32') return "Tab closing is only supported in desktop mode (Windows).";
        const count = parseInt(args.count) || 1;
        const psCloseTab = `
          Add-Type -AssemblyName System.Windows.Forms;
          Add-Type -TypeDefinition \"using System; using System.Runtime.InteropServices; public class User32 { [DllImport(\"user32.dll\")] public static extern bool SetForegroundWindow(IntPtr hWnd); }\";
          $browsers = @('chrome', 'msedge', 'brave', 'firefox', 'opera', 'vivaldi');
          $found = $false;
          foreach ($b in $browsers) {
              $proc = Get-Process -Name $b -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1;
              if ($proc) {
                  [User32]::SetForegroundWindow($proc.MainWindowHandle) | Out-Null;
                  Start-Sleep -Milliseconds 400;
                  for ($i=0; $i -lt ${count}; $i++) {
                      [System.Windows.Forms.SendKeys]::SendWait('^w');
                      Start-Sleep -Milliseconds 250;
                  }
                  $found = $true; break;
              }
          }
          if ($found) { Write-Output \"Success\" } else { Write-Error \"No active browser found.\" }
        `;
        try {
            await execPromise(`C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe -WindowStyle Hidden -Command "${psCloseTab.replace(/\n/g, ' ')}"`);
            return `Closed ${count} tabs in the active browser window.`;
        } catch (e) {
            return `Failed to close tabs. Ensure tracking is allowed or the browser is open.`;
        }

      case 'get_folder_count':
        if (process.platform !== 'win32') return "System stats are only supported in desktop mode (Windows).";
        const psCount = `
          $path = switch ('${sanitizeShell(args.directory)}'.ToLower()) {
            'desktop' { [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop) }
            'documents' { [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::MyDocuments) }
            'downloads' { Join-Path $HOME \"Downloads\" }
            'pictures' { [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::MyPictures) }
            'music' { [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::MyMusic) }
            default { [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop) }
          }
          (Get-ChildItem -Path $path -Directory).Count
        `;
        const { stdout: countOut } = await execPromise(`C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe -NoProfile -Command "${psCount.replace(/\n/g, ' ')}"`);
        return `There are ${countOut.trim()} folders on the ${args.directory}.`;
 
      case 'open_folder':
        if (process.platform !== 'win32') return "Folder opening is only supported in desktop mode (Windows).";
        const folderArg = sanitizeShell(args.path);
        const folderPathClean = folderArg.toLowerCase().trim();
        let targetPath = folderArg;
        
        // Handle special shell locations
        if (folderPathClean.includes('recycle') && folderPathClean.includes('bin')) targetPath = 'shell:RecycleBinFolder';
        else if (folderPathClean === 'control panel') targetPath = 'shell:ControlPanelFolder';
        else if (folderPathClean === 'this pc' || folderPathClean === 'my computer') targetPath = 'shell:MyComputerFolder';
        else if (folderPathClean === 'desktop') targetPath = '[System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)';
        else if (folderPathClean === 'documents' || folderPathClean === 'my documents') targetPath = '[System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::MyDocuments)';
        else if (folderPathClean === 'downloads') targetPath = 'Join-Path $HOME "Downloads"';
        else if (folderPathClean === 'pictures') targetPath = '[System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::MyPictures)';
        else if (folderPathClean === 'music') targetPath = '[System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::MyMusic) ';
        else {
          // Attempt 1: Search system index for the folder
          const searchResult = await executeTool('search_system', { query: args.path, search_type: 'folder' });
          if (searchResult.startsWith('Found')) {
            const lines = searchResult.split('\n');
            const firstMatch = lines.find(l => l.includes('Path:'))?.split('Path: ')[1];
            if (firstMatch) targetPath = firstMatch;
          } else {
            // Attempt 2: find on Desktop (legacy behavior)
            const psFindFolder = `
              $desktop = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop);
              $folder = Get-ChildItem -Path $desktop -Directory -Filter '*${folderArg}*' | Select-Object -First 1;
              if ($folder) { echo $folder.FullName } else { echo '${folderArg}' };
            `;
            const { stdout: foundPath } = await execPromise(`C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe -NoProfile -Command \"${psFindFolder.replace(/\\n/g, ' ')}\"`);
            targetPath = foundPath.trim();
          }
        };
        
        // If it's a shell command, don't wrap in quotes for explorer.exe if it's already a full shell: path
        const isShell = targetPath.startsWith('shell:');
        const finalCmd = isShell ? `start ${targetPath}` : `explorer.exe "${targetPath}"`;
        await execPromise(`C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe -NoProfile -Command "${finalCmd}"`);
        return `Successfully opened: ${args.path}`;

      case 'search_system':
        if (process.platform !== 'win32') return "System search is only supported on Windows.";
        const psSearchQuery = `
          $query = '${sanitizeShell(args.query)}';
          $type = '${sanitizeShell(args.search_type || 'all')}';
          $filter = '';
          if ($type -eq 'app') { $filter = 'AND (System.ItemType = ".lnk" OR System.ItemType = ".exe")' }
          elseif ($type -eq 'file') { $filter = 'AND System.ItemType <> "" AND System.ItemType <> "Directory" AND System.ItemType <> ".lnk"' }
          elseif ($type -eq 'folder') { $filter = 'AND System.ItemType = "Directory"' }

          $sql = "SELECT System.ItemPathDisplay, System.ItemNameDisplay, System.ItemType FROM SystemIndex WHERE System.ItemNameDisplay LIKE '%$query%' $filter";
          $connector = New-Object -ComObject ADODB.Connection;
          $recordset = New-Object -ComObject ADODB.Recordset;
          try {
            $connector.Open("Provider=Search.CollatorDSO;Extended Properties='Application=Windows';");
            $recordset.Open($sql, $connector);
            $results = @();
            $count = 0;
            while (-not $recordset.EOF -and $count -lt 10) {
                $results += "Name: $($recordset.Fields.Item('System.ItemNameDisplay').Value) | Path: $($recordset.Fields.Item('System.ItemPathDisplay').Value) | Type: $($recordset.Fields.Item('System.ItemType').Value)";
                $recordset.MoveNext();
                $count++;
            }
            if ($results.Length -eq 0) { "No matches found for '$query'." }
            else { "Found $($results.Length) matches:\n" + ($results -join "\n") }
          } catch {
            "Error querying search index: $($_.Exception.Message)"
          }
        `;
        const { stdout: searchQueryOut } = await execPromise(`C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe -NoProfile -Command "${psSearchQuery.replace(/\n/g, ' ')}"`);
        return searchQueryOut.trim();

      case 'open_file':
        if (process.platform !== 'win32') return "File opening is only supported on Windows.";
        const filePath = args.path.replace(/[\"']/g, ''); 
        await execPromise(`start \"\" \"${filePath}\"`);
        return `Successfully opened file: ${filePath}`;

      case 'get_desktop_items':
        const psDesktopItems = `
           $paths = @(
             [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop),
             [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::CommonDesktopDirectory)
           );
           $items = foreach ($p in $paths) { Get-ChildItem -Path $p -ErrorAction SilentlyContinue };
           $items | Select-Object Name, Extension | ConvertTo-Json
        `;
        const { stdout: desktopOut } = await execPromise(`C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe -NoProfile -Command "${psDesktopItems.replace(/\n/g, ' ')}"`);
        return `Desktop Items:\n${desktopOut.trim()}`;

      case 'list_files':
        const psList = `
          $path = switch ('${args.directory}'.ToLower()) {
            'desktop' { [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop) }
            'documents' { [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::MyDocuments) }
            'downloads' { Join-Path $HOME "Downloads" }
            'pictures' { [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::MyPictures) }
            'music' { [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::MyMusic) }
            default { [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop) }
          }
          Get-ChildItem -Path $path | Select-Object Name -ExpandProperty Name
        `;
        const { stdout: listOut } = await execPromise(`C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe -NoProfile -Command "${psList.replace(/\n/g, ' ')}"`);
        return `Items in ${args.directory}:\n${listOut.trim()}`;

      case 'analyze_image':
      // Vision logic using Groq's vision models
      try {
        const imageBase64 = fs.readFileSync(args.image_path).toString('base64');
          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'llama-3.2-11b-vision-preview',
              messages: [
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: args.prompt || 'Describe this evidence photo in detail for a forensic report.' },
                    { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
                  ]
                }
              ],
              max_tokens: 1024
            })
          });
          const visionResult = await response.json();
          if (visionResult.error) {
            return `Vision analysis API error: ${visionResult.error.message}`;
          }
          return visionResult.choices?.[0]?.message?.content || 'Vision analysis failed: Empty response from AI.';
        } catch (e) {
          return `Error analyzing image: ${e.message}`;
        }

      case 'generate_report':
        const reportDir = path.join(os.homedir(), 'JARVIS_Reports');
        if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
        const reportPath = path.join(reportDir, sanitizeShell(args.filename));
        const reportContent = `INVESTIGATOR REPORT\nTITLE: ${args.title}\nDATE: ${new Date().toLocaleString()}\n\n${args.content}`;
        await fsPromises.writeFile(reportPath, reportContent);
        return `Report generated successfully at: ${reportPath}`;

      case 'selenium_web_automation':
        try {
          const { action, target, value, platform } = args;
          
          // Action that doesn't need driver if it's 'close' and already null
          if (action === 'close' && !driverInstance) return "Browser already closed.";

          const drv = await getDriver();
          
          switch (action) {
            case 'navigate':
              await drv.get(target.startsWith('http') ? target : `https://${target}`);
              return `Navigating to ${target}`;

            case 'search':
              let searchUrl = `https://www.google.com/search?q=${encodeURIComponent(target)}`;
              if (platform === 'youtube') searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(target)}`;
              await drv.get(searchUrl);
              return `Searching for ${target} on ${platform || 'Google'}`;

            case 'type':
              const inputField = await drv.wait(until.elementLocated(By.css(target)), 5000);
              await inputField.clear();
              await inputField.sendKeys(value, Key.RETURN);
              return `Typed "${value}" into ${target}`;

            case 'click':
              const clickTarget = await drv.wait(until.elementLocated(By.css(target)), 5000);
              await clickTarget.click();
              return `Clicked on ${target}`;

            case 'get_text':
              const pageTitle = await drv.getTitle();
              const pageUrl = await drv.getCurrentUrl();
              const pageBody = await drv.findElement(By.tagName('body')).getText();
              return `URL: ${pageUrl}\nTITLE: ${pageTitle}\n\nCONTENT (truncated):\n${pageBody.substring(0, 3000)}`;

            case 'scroll_down':
              const scrollAmtDown = value || '500';
              await drv.executeScript(`window.scrollBy(0, ${scrollAmtDown})`);
              return `Scrolled down by ${scrollAmtDown} pixels.`;

            case 'scroll_up':
              const scrollAmtUp = value || '500';
              await drv.executeScript(`window.scrollBy(0, -${scrollAmtUp})`);
              return `Scrolled up by ${scrollAmtUp} pixels.`;

            case 'capture_page':
              const screenshot = await drv.takeScreenshot();
              const screenshotPath = path.join(__dirname, `capture_${Date.now()}.png`);
              fs.writeFileSync(screenshotPath, Buffer.from(screenshot, 'base64'));
              // Automatically analyze the screen using vision
              const visionDescription = await executeTool('analyze_image', { 
                image_path: screenshotPath, 
                prompt: "Describe what is currently visible on this webpage in detail. Focus on the main content, any visible articles, buttons, and status messages." 
              });
              return `SCREENSHOT CAPTURED: ${screenshotPath}\n\nVISUAL ANALYSIS:\n${visionDescription}`;

            case 'close':
              if (driverInstance) {
                await drv.quit();
                driverInstance = null;
              }
              return "Browser closed successfully.";

            default:
              return `Action ${action} not supported yet.`;
          }
        } catch (selErr) {
          if (selErr.name === 'NoSuchSessionError' || selErr.message.includes('Connection refused')) {
            driverInstance = null;
          }
          return `Selenium Error: ${selErr.message}`;
        }

      case 'capture_desktop':
        if (process.platform !== 'win32') return "Desktop capture is only supported on Windows.";
        try {
          const desktopPath = path.join(__dirname, `desktop_${Date.now()}.png`);
          const psScreenshot = `
            Add-Type -AssemblyName System.Windows.Forms;
            Add-Type -AssemblyName System.Drawing;
            $Screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds;
            $Bitmap = New-Object System.Drawing.Bitmap($Screen.Width, $Screen.Height);
            $Graphics = [System.Drawing.Graphics]::FromImage($Bitmap);
            $Graphics.CopyFromScreen(0,0,0,0,$Bitmap.Size);
            $Bitmap.Save('${desktopPath}');
            $Graphics.Dispose();
            $Bitmap.Dispose();
          `;
          await execPromise(`C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe -NoProfile -Command "${psScreenshot.replace(/\n/g, ' ')}"`);
          
          if (fs.existsSync(desktopPath)) {
            // Analyze the desktop screenshot
            const desktopVision = await executeTool('analyze_image', { 
              image_path: desktopPath, 
              prompt: "Describe what is currently visible on the user's desktop/screen. Identify open windows, applications, and any important notifications or files." 
            });
            return `DESKTOP CAPTURED: ${desktopPath}\n\nVISUAL ANALYSIS:\n${desktopVision}`;
          } else {
            return "Failed to capture desktop screenshot.";
          }
        } catch (e) {
          return `Error capturing desktop: ${e.message}`;
        }

      case 'schedule_task':
        const schedulePath = path.join(__dirname, 'schedule.jsonl');
        const entry = JSON.stringify({ task: args.task, date: args.date, created_at: new Date().toISOString() }) + '\n';
        await fsPromises.appendFile(schedulePath, entry);
        return `Task scheduled: "${args.task}" for ${args.date}.`;

      // ── V8.0 CYBER CRIME RAG TOOL ──
      case 'ask_cybercrime':
        console.log(`[CYBER-RAG] Query: "${args.question}"`);
        let ragAnswer = null;

        // ── V9.1: LOCAL PDF RAG PRIMARY (Faster on Render) ──
        try {
          const manualChunks = await searchManual(args.question, 5);
          if (manualChunks.length > 0) {
            ragAnswer = 'KNOWLEDGE BASE (MHA-ASCL Cyber Crime Investigation Manual):\n\n' + 
              manualChunks.map((chunk, i) => `[Source ${i+1}]:\n${chunk}`).join('\n\n---\n\n');
            console.log(`[CYBER-RAG] LOCAL PDF SUCCESS — ${manualChunks.length} chunks found.`);
          } else {
            ragAnswer = 'Knowledge base mein is topic par specific information nahi mili. Lekin main apne training knowledge se jawab de raha hoon.';
            console.log('[CYBER-RAG] No matching chunks found in local store.');
          }
        } catch (localErr) {
          ragAnswer = 'Knowledge base access mein error aaya. Main apne training knowledge se jawab dunga.';
          console.error(`[CYBER-RAG] Local search error: ${localErr.message}`);
        }

        return ragAnswer;

      default:
        return `Error: Tool '${name}' is not recognized or implemented.`;
    }
  } catch (err) {
    console.error(`[TOOL ERROR] ${name}:`, err.message);
    return `Error executing piece: ${err.message}`;
  }
}

module.exports = {
  groqTools,
  executeTool
};

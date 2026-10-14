import { readdirSync, readFileSync } from "node:fs";
import { resolve, sep } from "node:path";

const SOURCE_ROOT = resolve(process.cwd(), "src");
const MODULE_DIRECTORY = "components/modules/checkinSheet/";
const MODULE_ENTRY = "@/components/modules/checkinSheet/checkinSheet";

const toPosix = (path: string): string => path.split(sep).join("/");

const productionFiles = readdirSync(SOURCE_ROOT, { recursive: true, encoding: "utf8" })
  .map(toPosix)
  .filter((path) => /\.tsx?$/.test(path) && !path.startsWith("__tests__/"));

const read = (path: string): string => readFileSync(resolve(SOURCE_ROOT, path), "utf8");

const filesContaining = (text: string): string[] => productionFiles.filter((path) => read(path).includes(text));

describe("the tasting form exists in one place only", () => {
  it("finds the source files to check", () => {
    expect(productionFiles).toContain(`${MODULE_DIRECTORY}checkinSheet.tsx`);
  });

  it("keeps every file of the sheet, the form, the photo, the venue field and the mutations inside the shared module", () => {
    const OWNED_NAMES =
      /(^|\/)(checkinForm|checkinSheet|photoPicker|venuePlaceField|useCreateCheckinMutation|useUpdateCheckinMutation|useCheckinDraft|checkinDraftStore)\.tsx?$/;
    const owned = productionFiles.filter((path) => OWNED_NAMES.test(path));

    expect(owned.length).toBeGreaterThanOrEqual(8);
    const outside = owned.filter((path) => !path.startsWith(MODULE_DIRECTORY) && path !== "types/components/checkinSheet.ts");
    expect(outside).toEqual([]);
    expect(owned.filter((path) => path.startsWith("pages/"))).toEqual([]);
  });

  it("renders the date and time field of a tasting in the shared form alone", () => {
    expect(filesContaining("datetime-local")).toEqual([`${MODULE_DIRECTORY}components/checkinForm/checkinForm.tsx`]);
  });

  it("sends a new tasting from the shared mutation alone", () => {
    const callers = productionFiles.filter((path) => /\bcreateCheckin\b/.test(read(path)) && !path.startsWith("utils/queryFunctions/"));

    expect(callers).toEqual([`${MODULE_DIRECTORY}hooks/useCreateCheckinMutation.ts`]);
  });

  it.each(["pages/beerDetail/beerDetail.tsx", "pages/journal/journal.tsx"])("opens the shared sheet from %s", (page) => {
    expect(read(page)).toContain(`from "${MODULE_ENTRY}"`);
  });
});

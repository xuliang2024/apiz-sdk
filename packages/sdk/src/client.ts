import { HttpClient, resolveConfig } from "./http.js";
import { generate as generateHelper } from "./helpers/generate.js";
import { speak as speakHelper, type SpeakHelperOptions } from "./helpers/speak.js";
import { AccountResource } from "./resources/account.js";
import { ModelsResource } from "./resources/models.js";
import { SkillsResource } from "./resources/skills.js";
import { SyncResource } from "./resources/sync.js";
import { TasksResource } from "./resources/tasks.js";
import { ToolsResource } from "./resources/tools.js";
import { VoicesResource } from "./resources/voices.js";
import type {
  ApizOptions,
  GenerateOptions,
  GenerateResult,
  SynthesizeResponse,
} from "./types.js";

export class Apiz {
  readonly tasks: TasksResource;
  readonly models: ModelsResource;
  readonly voices: VoicesResource;
  readonly account: AccountResource;
  readonly skills: SkillsResource;
  readonly tools: ToolsResource;
  readonly sync: SyncResource;

  protected readonly _http: HttpClient;
  protected readonly _config: ReturnType<typeof resolveConfig>;

  constructor(options: ApizOptions = {}) {
    this._config = resolveConfig(options);
    this._http = new HttpClient(this._config);

    this.tasks = new TasksResource(this._http);
    this.models = new ModelsResource(this._http);
    this.voices = new VoicesResource(this._http);
    this.account = new AccountResource(this._http);
    this.skills = new SkillsResource(this._http);
    this.tools = new ToolsResource(this._http);
    this.sync = new SyncResource(this._http);
  }

  get apiKey(): string {
    return this._config.apiKey;
  }

  get baseURL(): string {
    return this._config.baseURL;
  }

  get timeout(): number {
    return this._config.timeout;
  }

  generate(options: GenerateOptions): Promise<GenerateResult> {
    return generateHelper(this, options);
  }

  speak(text: string, options: SpeakHelperOptions = {}): Promise<SynthesizeResponse> {
    return speakHelper(this, text, options);
  }
}

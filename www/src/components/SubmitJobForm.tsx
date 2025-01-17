import * as React from "react";
import { Checkbox, Form, FormGroup, ControlLabel, FormControl, Button, ButtonToolbar} from "react-bootstrap";
import { formatDate, appStore, AppDispatcher, Action, Jobs, Job, JobStatus, JobProgress, timeSince, minutesSince } from "../stores/Stores";
import { Option } from "./Widgets"

declare var require: any;
let Select = require('react-select');

export class SubmitJobFormComponent extends React.Component<{
  onCreate: (job: Job) => void;
  onCancel: () => void;
  template?: Job;
}, {
    job: Job;
    set: Option;
    codec: Option;
    arch: Option;
  }> {
  constructor() {
    super();
  }
  componentWillMount() {
    let job = new Job();
    if (this.props.template) {
      let template = this.props.template;
      job.codec = template.codec;
      job.commit = template.commit;
      job.buildOptions = template.buildOptions;
      job.extraOptions = template.extraOptions;
      job.nick = template.nick;
      job.qualities = template.qualities;
      job.id = template.id;
      if (job.id.indexOf("@") > 0) {
        job.id = job.id.substr(0, job.id.indexOf("@"));
      }
      job.task = template.task;
      job.taskType = template.taskType;
      job.arch = template.arch;
    }
    let task = job.task ? job.task : "objective-1-fast";
    let codec = job.codec ? job.codec : "av1";
    let arch = job.arch ? job.arch : "x86_64";
    job.id += "@" + formatDate(new Date());
    this.state = {
      job: null,
      set: {label: task, value: task},
      codec: {label: Job.codecs[codec], value: codec},
      arch: {label: job.arch, value: job.arch},
    } as any;
    job.saveEncodedFiles = true;
    this.setState({ job } as any);
  }
  getValidationState(name?: string): "success" | "warning" | "error" {
    function checkCli(cli: string) {
      if (cli == "") return true;
      return cli.split(" ").every(arg => {
        return arg.indexOf("--") == 0;
      });
    }
    let job = this.state.job;
    switch (name) {
      case "all":
        return ["id", "commit", "codec", "set", "nick", "qualities"].every(name =>
          (this.getValidationState(name) === "success")
        ) ? "success" : "error";
      case "id":
        if (job.id) {
          if (appStore.findJob(job.id)) {
            return "error";
          }
          return "success";
        }
        break;
      case "commit":
        let commit = job.commit.trim();
        if (commit.length === 41 && commit.charAt(0) === 'I') {
          return "error"; // Gerrit Change-ID format, not a git reference
        }
        if (job.commit) return "success";
      case "codec":
        if (this.state.codec.value) return "success";
        break;
      case "set":
        if (this.state.set.value) {
          if (this.state.codec.value === "av2-as") {
            if (this.state.set.value === "av2-a1-4k-as") {
              return "success";
            } else {
              return "error";
            }
          }
          return "success";
        }
        break;
      case "nick":
        if (job.nick) return "success";
        break;
      case "qualities":
        if (job.qualities.length === 0) {
          return "success";
        } else {
          if (job.qualities.split(" ").every((quality, index, array) => {
            let v = Number(quality);
            return (v | 0) === v;
          })) {
            return "success";
          }
        }
        break;
      case "extra":
        return checkCli(job.extraOptions) ? "success" : "warning";
      case "build":
        return checkCli(job.buildOptions) ? "success" : "warning";
      case "arch":
        if (job.arch) return "success";
        break;
    }
    return "error";
  }
  onInputChange(key: string, e: any) {
    let job = this.state.job;
    if (e.target.type === "checkbox") {
      job[key] = e.target.checked;
    } else {
      job[key] = e.target.value;
    }
    this.setState({ job } as any);
  }
  onCreate() {
    let job = this.state.job;
    job.date = new Date();
    job.task = this.state.set.value;
    job.codec = this.state.codec.value;
    job.arch = this.state.arch.value;
    this.props.onCreate(job);
  }
  onCancel() {
    this.props.onCancel();
  }
  onChangeCodec(codec: Option) {
    this.setState({ codec } as any, () => { });
  }

  onChangeSet(set: Option) {
    this.setState({ set } as any, () => { });
  }

  onChangeAuthor(author: Option) {
    this.setState({ author } as any, () => { });
  }

  onChangeArch(arch: Option) {
    this.setState({ arch } as any, () => { });
  }

  onChangeConfigs(configs: Option) {
    this.setState({ configs } as any, () => { });
  }
  render() {
    let job = this.state.job;

    let codecOptions = [];
    for (let key in Job.codecs) {
      let name = Job.codecs[key];
      codecOptions.push({ value: key, label: name });
    }

    let setOptions = [];
    for (let key in Job.sets) {
      let set = Job.sets[key];
      setOptions.push({ value: key, label: key });
    }

    const archOptions = [{value: 'x86_64', label: 'x86_64'}, {value: 'aarch64', label: 'aarch64'}];

    return <Form>
      <FormGroup validationState={this.getValidationState("id")}>
        <FormControl type="text" placeholder="ID"
          value={job.id} onChange={this.onInputChange.bind(this, "id")} />
      </FormGroup>

      <FormGroup validationState={this.getValidationState("commit")}>
        <FormControl type="text" placeholder="Git Commit Reference (Hash/Branch/Tag)"
          value={job.commit} onChange={this.onInputChange.bind(this, "commit")} />
      </FormGroup>

      <FormGroup validationState={this.getValidationState("codec")}>
        <ControlLabel>Encoder</ControlLabel>
        <Select clearable={false} placeholder="Encoder" value={this.state.codec} options={codecOptions} onChange={this.onChangeCodec.bind(this)} />
      </FormGroup>

      <FormGroup validationState={this.getValidationState("set")}>
        <ControlLabel>Set</ControlLabel>
        <Select clearable={false} placeholder="Set" value={this.state.set} options={setOptions} onChange={this.onChangeSet.bind(this)} />
      </FormGroup>

      <FormGroup validationState={this.getValidationState("extra")}>
        <ControlLabel>Extra CLI Options</ControlLabel>
        <FormControl type="text" placeholder="Extra CLI Options"
          value={job.extraOptions} onChange={this.onInputChange.bind(this, "extraOptions")} />
      </FormGroup>

      <FormGroup validationState={this.getValidationState("build")}>
      <ControlLabel>Extra Build Options (experiments)</ControlLabel>
        <FormControl type="text" placeholder="Extra Build Options"
          value={job.buildOptions} onChange={this.onInputChange.bind(this, "buildOptions")} />
      </FormGroup>

      <FormGroup validationState={this.getValidationState("nick")}>
        <ControlLabel>Your name or IRC nick</ControlLabel>
        <FormControl type="text" placeholder="(auto-notifies on #daala)"
          value={job.nick} onChange={this.onInputChange.bind(this, "nick")} />
      </FormGroup>

      <FormGroup validationState={this.getValidationState("qualities")}>
        <ControlLabel>Custom qualities (optional)</ControlLabel>
        <FormControl type="text" placeholder="30 40 50 ..."
          value={job.qualities} onChange={this.onInputChange.bind(this, "qualities")} />
      </FormGroup>

      <FormGroup validationState={this.getValidationState("arch")}>
        <ControlLabel>Architecture</ControlLabel>
        <Select clearable={false} placeholder="Encoder" value={this.state.arch} options={archOptions} onChange={this.onChangeArch.bind(this)} />
      </FormGroup>

      <FormGroup>
        <ButtonToolbar>
          <Button bsSize="small" disabled={this.getValidationState("all") === "error"} bsStyle="success" onClick={this.onCreate.bind(this)}>Submit</Button>
          <Button bsSize="small" bsStyle="danger" onClick={this.onCancel.bind(this)}>Cancel</Button>
        </ButtonToolbar>
      </FormGroup>
    </Form>
  }
}

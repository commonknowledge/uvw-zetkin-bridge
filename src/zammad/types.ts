export interface ZammadObjectProperty {
  name:        string;
  object:      string;
  display:     string;
  active:      boolean;
  data_type:   string;
  data_option: DataOption;
  screens:     Screens;
}

export interface DataOption {
  default?:      string;
  type?:         string;
  maxlength?:    number;
  linktemplate?: string;
  diff?:         number;
}

export interface Screens {
  edit:            Edit;
  view:            View;
  create:          Create;
  signup:          Signup;
  invite_customer: Edit;
  invite_agent:    InviteAgent;
}

export interface Create {
  "ticket.customer": CreateAdminUser;
  "ticket.agent":    CreateAdminUser;
  "admin.user":      CreateAdminUser;
}

export interface CreateAdminUser {
  shown:    boolean;
  required: boolean;
}

export interface Edit {
  "ticket.agent": CreateAdminUser;
  "admin.user":   CreateAdminUser;
}

export interface InviteAgent {
  "admin.user": CreateAdminUser;
}

export interface Signup {
  "ticket.customer": CreateAdminUser;
}

export interface View {
  "ticket.agent":    ViewAdminUser;
  "admin.user":      ViewAdminUser;
  "ticket.customer": ViewAdminUser;
}

export interface ViewAdminUser {
  shown: boolean;
}

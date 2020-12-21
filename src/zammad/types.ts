export namespace ZammadObjectPropertyFromList {
  export interface Property {
    id:              number;
    name:            string;
    display:         string;
    data_type:       string;
    data_option:     DataOption;
    data_option_new: DataOptionNew;
    editable:        boolean;
    active:          boolean;
    screens:         Screens;
    to_create:       boolean;
    to_migrate:      boolean;
    to_delete:       boolean;
    to_config:       boolean;
    position:        number;
    created_by_id:   number;
    updated_by_id:   number;
    created_at:      Date;
    updated_at:      Date;
    object:          string;
  }

  export interface DataOption {
      options:    Options;
      default:    string;
      null:       boolean;
      maxlength:  number;
      nulloption: boolean;
  }

  export interface Options {
      Mr:      string;
      Ms:      string;
      Company: string;
  }

  export interface DataOptionNew {
  }

  export interface Screens {
      create:        Create;
      edit:          Edit;
      create_middle: CreateMiddle;
  }

  export interface Create {
      Customer: Customer;
  }

  export interface Customer {
      shown:    boolean;
      required: boolean;
  }

  export interface CreateMiddle {
      Agent: Agent;
  }

  export interface Agent {
      shown: boolean;
  }

  export interface Edit {
      Customer: Agent;
      Agent:    Agent;
  }
}

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

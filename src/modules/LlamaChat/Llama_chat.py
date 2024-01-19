from llama_cpp import Llama, ChatCompletionMessage
llm = None

def init_chat(model_path: str, n_ctx: int = 512, verbose: bool = True) -> None:
    global llm

    # model_path="./models/codellama-7b.Q4_K_M.gguf"
    # n_ctx=512
    llm = Llama(model_path=model_path, n_ctx=n_ctx, verbose=verbose)

# Please see https://github.com/abetlen/llama-cpp-python/blob/main/examples/low_level_api/low_level_api_chat_cpp.py
# for a full example of a proper interactive mode. To make this possible to use here, one would
# need to write a replacement for the `interact` method so that input/output is done programmatically
# instead of via the console
"""
	# interactive mode
	def interact(self):
		for i in self.output():
			print(i,end="",flush=True)
		self.params.input_echo = False

		while self.params.interactive:
			self.set_color(util.CONSOLE_COLOR_USER_INPUT)
			if (self.params.instruct):
				print('\n> ', end="")
CHANGE THIS -->	self.input(self.read_input())
			else:
				print(self.params.input_prefix, end="") 
CHANGE THIS -->	self.input(f"{self.params.input_prefix}{self.read_input()}{self.params.input_suffix}")
				print(self.params.input_suffix,end="")
			self.set_color(util.CONSOLE_COLOR_DEFAULT)

			try:
				for i in self.output():
CHANGE THIS -->	    print(i,end="",flush=True)
			except KeyboardInterrupt:
				self.set_color(util.CONSOLE_COLOR_DEFAULT)
				if not self.params.instruct:
					print(self.params.fix_prefix,end="")
					self.input(self.params.fix_prefix)
"""

def do_completion(prompt: str, suffix: str=None, max_tokens: int=256, temperature: float=0.8,
                  top_p: float=0.95, top_k: int=40, logprobs: int=None, logits_processor=None,
                  frequency_penalty: float=0.0, presence_penalty: float=0.0, repeat_penalty: float=1.1,
                  tfs_z=1.0, mirostat_mode=0, mirostat_tau: float=5.0, mirostat_eta: float=0.1,
                  stopping_criteria=None, echo: bool=False, stream:bool=False, stop: any=[]) -> str:
    """ 
    Generates a response from a prompt
    params:
        prompt:str	                    The prompt to generate text from.
        suffix: str = None              A suffix to append to the generated text. If None, no suffix is appended.
        max_tokens: int = 128           The maximum number of tokens to generate.
        temperature: float = 0.8        The temperature to use for sampling.
        top_p: float = 0.95             The top-p value to use for sampling.
        top_k: int = 40                 The top-k value to use for sampling.
        logprobs: int = None            The number of logprobs to return. If None, no logprobs are returned.
        logits_processor: Optional[LogitsProcessorList] = None
        frequency_penalty: float=0.0
        presence_penalty: float=0.0
        repeat_penalty: float = 1.1     The penalty to apply to repeated tokens.
        tfs_z: float = 1.0
        mirostat_mode: int = 0
        mirostat_tau: float = 5.0
        mirostat_eta: float = 0.1
        stopping_criteria = None
        echo: bool = False              Whether to echo the prompt.
        stream: bool = False            Whether to stream the results.
        stop: [Union[str, List[str]]] = [] A list of strings to stop generation when encountered.
    """

    completion = llm(prompt, max_tokens=max_tokens, stop=stop, echo=True)
    # return completion
    return completion["choices"][0]["text"] \
           if completion and completion["choices"] and completion["choices"][0]["text"] \
           else "";

def do_chat(prompt: str, system_prompt: str=None, max_tokens: int=256,  temperature: float=0.8,
            top_p: float=0.95, top_k: int=40, logits_processor=None,
            frequency_penalty: float=0.0, presence_penalty: float=0.0, repeat_penalty: float=1.1,
            tfs_z=1.0, mirostat_mode=0, mirostat_tau: float=5.0, mirostat_eta: float=0.1,
            grammar: any = None, functions: any = None, function_call: any = None,
            stream:bool=False, stop: any=[]) -> str:
    """ 
    Generates a response from a prompt
    params:
        prompt:str	                    The prompt to generate text from.
        system_prompt: str=None         The description of the assistant
        max_tokens: int = 128           The maximum number of tokens to generate.
        temperature: float = 0.8        The temperature to use for sampling.
        top_p: float = 0.95             The top-p value to use for sampling.
        top_k: int = 40                 The top-k value to use for sampling.
        logits_processor = None
        frequency_penalty: float=0.0
        presence_penalty: float=0.0
        repeat_penalty: float = 1.1     The penalty to apply to repeated tokens.
        tfs_z: float = 1.0,
        mirostat_mode: int = 0,
        mirostat_tau: float = 5.0,
        mirostat_eta: float = 0.1,
        grammar: Optional[LlamaGrammar] = None
        functions: Optional[List[ChatCompletionFunction]] = None,
        function_call: Optional[Union[str, ChatCompletionFunctionCall]] = None,
        stream: bool = False            Whether to stream the results.
        stop: [Union[str, List[str]]] = [] A list of strings to stop generation when encountered.
    """

    if not system_prompt:
        system_prompt = "You're a helpful assistant who answers questions the user asks of you concisely and accurately."

    chat = llm.create_chat_completion(
                messages=[
                    ChatCompletionMessage(role="system", content="\"" + system_prompt + "\""),
                    ChatCompletionMessage(role="user",   content="\"" + prompt + "\""),
                ],
                max_tokens=max_tokens, temperature=temperature, stream=stream, stop=stop)

    return chat["choices"][0]["message"]["content"] \
           if chat["choices"] and chat["choices"][0]["message"] and chat["choices"][0]["message"]["content"] \
           else ''

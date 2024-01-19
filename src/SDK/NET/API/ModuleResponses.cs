﻿namespace CodeProject.AI.SDK.API
{
    /// <summary>
    /// The common data for responses from analysis modules.
    /// </summary>
    public class ModuleResponse : BaseResponse
    {
        /// <summary>
        /// Gets or sets the Id of the Module handling this request
        /// </summary>
        public string? ModuleId { get; set; }

        /// <summary>
        /// Gets or sets the name of the Module handling this request
        /// </summary>
        public string? ModuleName { get; set; }
        
        /// <summary>
        /// Gets or sets the optional command associated with this request
        /// </summary>
        public string? Command { get; set; }

        /// <summary>
        /// Gets or sets the execution provider (hardware or library) that handles the AI 
        /// acceleration.
        /// </summary>
        public string? ExecutionProvider { get; set; }

        /// <summary>
        /// Gets or sets whether this module is able to make use of a GPU.
        /// </summary>
        public bool CanUseGPU { get; set; }

        /// <summary>
        /// Gets or sets the number of milliseconds required to perform the AI inference operation(s)
        /// for this response.
        /// </summary>
        public long InferenceMs { get; set; }

        /// <summary>
        /// Gets or sets the number of milliseconds required to perform the AI processing for this
        /// response. This includes the inference, as well as any pre- and post-processing.
        /// </summary>
        public long ProcessMs { get; set; }

        /// <summary>
        /// Gets or sets the number of milliseconds required to run the full task in processing this
        /// response.
        /// </summary>
        public long AnalysisRoundTripMs { get; set; }
    }

    /// <summary>
    /// Represents a failed response from a module.
    /// </summary>
    public class ModuleErrorResponse : ModuleResponse
    {
        /// <summary>
        /// Gets or sets the error message, if any. May be null if no error.
        /// </summary>
        public string? Error { get; set; }

        public ModuleErrorResponse()
        {
            Success = false;
        }

        public ModuleErrorResponse(string? error)
        {
            Success = false;
            Error   = error;
        }
    }
}

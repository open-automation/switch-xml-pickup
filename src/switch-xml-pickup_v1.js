// For each helper function
var forEach = function(array, callback){
   var currentValue, index;
   var i = 0;
   for (i; i < array.length; i += 1) {
      if(typeof array[i] == "undefined"){
         currentValue = null;
      } else {
         currentValue = array[i];
      }
      index = i;
      callback(currentValue, i, array);
    }
}

var get_properties = function( s : Switch )
{
	p = {
		pickup_mode:		s.getPropertyValue("PickupMode"),
		dataset_name:		s.getPropertyValue("DatasetName"),
		filename_pattern:	s.getPropertyValue("MetadataFilenamePattern"),
		match_pattern:		s.getPropertyValue("MetadataFilenamePattern"),
		orphan_timeout_min:	s.getPropertyValue("OrphanTimeout"),
		orphan_timeout_sec:	s.getPropertyValue("OrphanTimeout")*60,
		file_filters:		s.getPropertyValue("MetadataFileFilters"),
		search_depth:		s.getPropertyValue("SearchDepth"),
		asset_path:		s.getPropertyValue("AssetPath"),
		delete_asset:		s.getPropertyValue("DeleteAsset")
	};

	// Slice off *
	if(p.match_pattern.charAt(0) == "*"){
		p.match_pattern = p.match_pattern.substring(1, p.match_pattern.length);
	}

	return p;
};

var is_valid_xml_document = function( file_path )
{
	// Check file name
	suffix = file_path.substring(file_path.length - 3);
	if(suffix.toUpperCase() !== "XML"){
		return false;
	}

	// Check xml document
	var doc = new Document(file_path);
	if(!doc.isWellFormed()){
		return false;
	} else {
		return true;
	}
};

var get_pending_jobs = function(s : Switch, trigger_job : Job, p)
{
	jobs = s.getJobs();

	s.log(-1, "Jobs in preceding folder " + jobs.length);

	return_obj = {
		metadata_job: null,
		asset_job: null
	}
	loop_job = null;

	regex = new RegExp(p.match_pattern);


	i = 0;
	for (i; i < jobs.length; i += 1) {


		loop_job = jobs.getItem(i);


		if(!loop_job){
			s.log(3, "Couldn't get loop_job from jobs list.");
		}


		if(trigger_job.getExtension().toUpperCase() == "XML"){
			return_obj.metadata_job = trigger_job;
			return_obj.asset_job = loop_job;
			//s.log(-1, "IDENT metadata_job");
		} else {
			return_obj.asset_job = trigger_job;
			return_obj.metadata_job = loop_job;
			//s.log(-1, "IDENT asset_job");
		}

		// Skip itself in the loop
		if(return_obj.asset_job.getName() !== return_obj.metadata_job.getName()){

			s.log(-1, "metadata: " + return_obj.metadata_job.getName() + ", asset: " + return_obj.asset_job.getName());

			match_start_position = regex.search( return_obj.metadata_job.getName() );

			if(match_start_position !== -1){
				//s.log(-1, "match found at position "+match_start_position);

				matched_current_filename = return_obj.metadata_job.getName().substring(0, match_start_position);

				if(return_obj.asset_job.getNameProper() == matched_current_filename){
					s.log(-1, "Found a match");
					return return_obj;
				}
			}

		} else {
			s.log(-1, "Skipping over itself in the loop");
			//continue;
		}

	}
	return false;
}

var job_path_exists = function( s : Switch, job : Job )
{
	dir = new Dir( job.getPath() );
	if(dir.exists === true){
		return true;
	} else {
		// Check to see if is a file
		fs = new FileStatistics( job.getPath() );
		is_file = fs.isFile();
		if(is_file == true){
			return true;
		}
	}
	return false;
}

var handle_pickup = function( s : Switch, job : Job, properties, callback )
{
	p = properties;

	if(p.pickup_mode == "Metadata alongside asset"){

		// Look through pending jobs
		s.log(-1, "triggering job name " + job.getName());

		job_obj = get_pending_jobs(s, job, p);

		if(job_obj !== false){

			// Restore metadata
			if(!is_valid_xml_document( job_obj.metadata_job.getPath() )){
				callback(false, "Matched job was not a well formed XML document.");
				return;
			}

			// Create dataset and backing path
			dataset = job_obj.asset_job.createDataset("XML");
			dataset_backing_path = dataset.getPath();

			// Overwrite backing file with source dataset
			dataset_copy_success = s.copy( job_obj.metadata_job.getPath(), dataset_backing_path );
			job_obj.asset_job.setDataset(p.dataset_name, dataset);

			// Remove the metadata
			job_obj.metadata_job.sendToNull( job_obj.metadata_job.getPath() );

			if(dataset_copy_success){
				callback(true, "Dataset successfully restored.", job_obj.asset_job);
			} else {
				callback(false, "Dataset backing path could not be copied to.", job_obj.asset_job);
			}
		} else {
			s.sleep( p.orphan_timeout_sec );
			//s.sleep( 10 );
			s.log(-1, "Sleep finished");

			// Check if the file is even there after sleeping
			if(job_path_exists(s, job) !== false){
				s.log(-1, "Found a job to orphan");

				// If it is, fail it
				callback(false, "Orphan timeout detected. Slept for "+p.orphan_timeout_min+" minutes.", job);
			}
		}
		return;
	} else 	if(p.pickup_mode == "Metadata in job folder asset"){
	} else 	if(p.pickup_mode == "Metadata refers to asset"){

		if(!is_valid_xml_document( p.asset_path )){
			callback(false, "Incoming job was not a well formed XML document.");
			return;
		}

		// Create dataset and backing path
		dataset = job.createDataset("XML");
		dataset_backing_path = dataset.getPath();

		// Overwrite backing file with source dataset
		dataset_copy_success = s.copy( p.asset_path, dataset_backing_path );
		job.setDataset(p.dataset_name, dataset);

		if(dataset_copy_success){
			callback(true, "Dataset successfully restored.");
		} else {
			callback(false, "Dataset backing path could not be copied to.");
		}
		return;
	} else 	if(p.pickup_mode == "Metadata is asset"){

		if(!is_valid_xml_document( job.getPath() )){
			callback(false, "Incoming job was not a well formed XML document.");
			return;
		}

		// Create dataset and backing path
		dataset = job.createDataset("XML");
		dataset_backing_path = dataset.getPath();

		// Overwrite backing file with source dataset
		dataset_copy_success = s.copy( job.getPath(), dataset_backing_path );
		job.setDataset(p.dataset_name, dataset);

		if(dataset_copy_success){
			callback(true, "Dataset successfully restored.");
		} else {
			callback(false, "Dataset backing path could not be copied to.");
		}
		return;
	}
}

function jobArrived( s : Switch, job : Job )
{
	var prop = get_properties(s);

	handle_pickup(s, job, prop, function(success, message, job){
		if(success === true){
			s.log(-1, message);
			job.sendToData(1, job.getPath() );
		} else {
			s.log(3, message);
			job.sendToData(3, job.getPath() );
		}

	});

	return;
}

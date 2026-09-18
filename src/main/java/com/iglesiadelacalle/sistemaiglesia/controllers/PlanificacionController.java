package com.iglesiadelacalle.sistemaiglesia.controllers;

import com.iglesiadelacalle.sistemaiglesia.dto.PlanificacionRequestDTO;
import com.iglesiadelacalle.sistemaiglesia.models.Planificacion;
import com.iglesiadelacalle.sistemaiglesia.services.PlanificacionService;
import com.iglesiadelacalle.sistemaiglesia.repository.PlanificacionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/planificacion")
@CrossOrigin(origins = "*")
public class PlanificacionController {

    @Autowired private PlanificacionService planificacionService;
    @Autowired private PlanificacionRepository planificacionRepository;

    @PostMapping("/crear")
    public ResponseEntity<?> crearPlanificacion(@RequestBody PlanificacionRequestDTO request) {
        try {
            planificacionService.guardarPlanificacion(request);
            return ResponseEntity.ok().body("Plan de evaluación guardado exitosamente.");
        } catch (Exception e) { return ResponseEntity.badRequest().body(e.getMessage()); }
    }

    @GetMapping("/clase/{idClase}")
    public ResponseEntity<?> obtenerPlanPorClase(@PathVariable Integer idClase) {
        List<Planificacion> planificaciones = planificacionRepository.findByClaseTeologia_IdClaseTeologia(idClase);
        
        if (planificaciones.isEmpty()) return ResponseEntity.noContent().build(); 
        
        List<Map<String, Object>> respuesta = new ArrayList<>();
        for (Planificacion p : planificaciones) {
            Map<String, Object> map = new HashMap<>();
            map.put("idPlanificacion", p.getIdPlanificacion()); // ⚡ NECESARIO PARA CALIFICAR
            map.put("escala", p.getEscala());                   // ⚡ LÍMITE MÁXIMO (Ej: 20)
            map.put("contenido", p.getContenidoEvaluar());
            map.put("actividad", p.getActividad().getDenominacion()); 
            map.put("ponderacion", p.getPonderacion());
            map.put("fecha", p.getFechaPlanif().toString());
            respuesta.add(map);
        }
        
        return ResponseEntity.ok(respuesta);
    }
}